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
});

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

app.get("/api/leaderboard", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, name, countryCode, flag, record, kills, deaths, score, gameMode, ovr, date FROM leaderboard ORDER BY score DESC, kills DESC LIMIT 100"
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

app.post("/api/leaderboard", async (req, res) => {
  try {
    const {
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
    } = req.body;

    if (!name || score === undefined) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const [result] = await db.query(
      `INSERT INTO leaderboard
      (name, countryCode, flag, record, kills, deaths, score, gameMode, ovr, date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        countryCode || null,
        flag || null,
        record || null,
        kills || 0,
        deaths || 0,
        score,
        gameMode || "normal",
        ovr || 0,
        date || new Date().toISOString().split("T")[0],
      ]
    );

    res.json({
      success: true,
      id: result.insertId,
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
