import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const rankedLeaderboardQuery = `
  SELECT
    id,
    name,
    countryCode,
    flag,
    record,
    kills,
    deaths,
    score,
    gameMode,
    ovr,
    date,
    ROW_NUMBER() OVER (
      ORDER BY score DESC, kills DESC, deaths ASC, id ASC
    ) AS position
  FROM leaderboard
`;

const getTotalEntries = async () => {
  const [rows] = await db.query("SELECT COUNT(*) AS total FROM leaderboard");
  return rows[0]?.total || 0;
};

const getEntryPosition = async ({ id, score, kills, deaths }) => {
  const [rows] = await db.query(
    `
    SELECT COUNT(*) + 1 AS position
    FROM leaderboard
    WHERE
      score > ?
      OR (score = ? AND kills > ?)
      OR (score = ? AND kills = ? AND deaths < ?)
      OR (score = ? AND kills = ? AND deaths = ? AND id < ?)
    `,
    [
      score,
      score,
      kills,
      score,
      kills,
      deaths,
      score,
      kills,
      deaths,
      id,
    ]
  );

  return rows[0]?.position || 1;
};

const getNearbyEntries = async (position, radius = 2) => {
  const start = Math.max(1, position - radius);
  const end = position + radius;

  const [rows] = await db.query(
    `
    SELECT *
    FROM (${rankedLeaderboardQuery}) AS ranked
    WHERE position BETWEEN ? AND ?
    ORDER BY position ASC
    `,
    [start, end]
  );

  return rows;
};

app.get("/", (req, res) => {
  res.json({ message: "Backend funcionando correctamente" });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT DATABASE() AS database_name, NOW() AS server_time"
    );

    res.json({
      success: true,
      env: {
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_USER: process.env.DB_USER,
        DB_NAME: process.env.DB_NAME,
        DB_PASSWORD_SET: !!process.env.DB_PASSWORD,
      },
      result: rows,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
    });
  }
});

/**
 * Ranking inicial.
 * Devuelve solo el Top 10 para no cargar toda la tabla.
 */
app.get("/api/leaderboard", async (req, res) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);

    const [rows] = await db.query(
      `
      SELECT *
      FROM (${rankedLeaderboardQuery}) AS ranked
      ORDER BY position ASC
      LIMIT ?
      `,
      [limit]
    );

    res.json(rows);
  } catch (error) {
    console.error("Error leaderboard:", error);

    res.status(500).json({
      error: "Error al obtener el ranking",
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
});

/**
 * Obtener contexto alrededor de una entrada ya guardada.
 * Devuelve:
 * - posición real
 * - 2 usuarios por arriba
 * - el usuario
 * - 2 usuarios por abajo
 */
app.get("/api/leaderboard/around/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const [entryRows] = await db.query(
      `
      SELECT id, score, kills, deaths
      FROM leaderboard
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!entryRows.length) {
      return res.status(404).json({ error: "Entrada no encontrada" });
    }

    const entry = entryRows[0];

    const position = await getEntryPosition({
      id: entry.id,
      score: entry.score,
      kills: entry.kills,
      deaths: entry.deaths,
    });

    const nearby = await getNearbyEntries(position, 2);
    const total = await getTotalEntries();

    res.json({
      success: true,
      id,
      position,
      total,
      nearby,
    });
  } catch (error) {
    console.error("Error leaderboard around:", error);

    res.status(500).json({
      error: "Error al obtener posición del ranking",
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
});

/**
 * Guardar resultado.
 * Después de guardar, devuelve la posición real y el bloque cercano.
 */
app.post("/api/leaderboard", async (req, res) => {
  try {
    const {
      name,
      countryCode,
      record,
      kills,
      deaths,
      score,
      gameMode,
      ovr,
      date,
    } = req.body;

    const cleanName = String(name || "").trim().slice(0, 100);
    const cleanCountryCode = String(countryCode || "ES").trim().toUpperCase().slice(0, 10);
    const cleanRecord = String(record || "0W-1L").trim().slice(0, 20);

    const cleanKills = Number(kills) || 0;
    const cleanDeaths = Number(deaths) || 0;
    const cleanScore = Number(score);
    const cleanOvr = Number(ovr) || 0;

    const cleanGameMode = gameMode === "lecHard" ? "lecHard" : "normal";
    const cleanDate = date || new Date().toISOString().split("T")[0];

    if (!cleanName || Number.isNaN(cleanScore)) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const [result] = await db.query(
      `
      INSERT INTO leaderboard
      (name, countryCode, flag, record, kills, deaths, score, gameMode, ovr, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        cleanName,
        cleanCountryCode,
        "",
        cleanRecord,
        cleanKills,
        cleanDeaths,
        cleanScore,
        cleanGameMode,
        cleanOvr,
        cleanDate,
      ]
    );

    const insertedId = result.insertId;

    const position = await getEntryPosition({
      id: insertedId,
      score: cleanScore,
      kills: cleanKills,
      deaths: cleanDeaths,
    });

    const nearby = await getNearbyEntries(position, 2);
    const total = await getTotalEntries();

    res.json({
      success: true,
      id: insertedId,
      position,
      total,
      nearby,
    });
  } catch (error) {
    console.error("Error guardar resultado:", error);

    res.status(500).json({
      error: "Error al guardar el resultado",
      message: error.message,
      code: error.code,
      sqlMessage: error.sqlMessage,
    });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor backend activo en puerto ${PORT}`);
});
