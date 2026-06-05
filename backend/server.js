import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const app = express();

app.set("trust proxy", 1);

const allowedOrigins = new Set([
  "https://5vs5.pro",
  "https://www.5vs5.pro",
  "http://localhost:3000",
  "http://localhost:5173",
]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
  })
);

app.use(express.json({ limit: "10kb" }));

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

const ALLOWED_GAME_MODES = new Set(["normal", "lecHard", "lcsHard"]);

const VALID_SCORE_MAX = 50000;
const SCORE_TOLERANCE = 5;

const validLeaderboardWhere = [
  "score BETWEEN 0 AND 50000",
  "kills BETWEEN 0 AND 250",
  "deaths BETWEEN 0 AND 150",
  "ovr BETWEEN 1 AND 99",
  "gameMode IN ('normal', 'lecHard', 'lcsHard')",
  "`record` REGEXP '^[0-6]W-[0-1]L$'",
  "CHAR_LENGTH(name) BETWEEN 1 AND 24",
].join("\n  AND ");

const rankedLeaderboardQuery = `
  SELECT
    id,
    name,
    countryCode,
    flag,
    \`record\` AS record,
    kills,
    deaths,
    score,
    gameMode,
    ovr,
    \`date\` AS date,
    ROW_NUMBER() OVER (
      ORDER BY score DESC, kills DESC, deaths ASC, id ASC
    ) AS position
  FROM leaderboard
  WHERE ${validLeaderboardWhere}
`;

const setNoStoreHeaders = (res) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.setHeader("Surrogate-Control", "no-store");
};

const getClientIp = (req) => {
  return String(
    req.headers["cf-connecting-ip"] ||
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown"
  );
};

const rateLimitBuckets = new Map();

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_SUBMISSIONS = 8;
const RATE_LIMIT_MIN_GAP_MS = 10 * 1000;

const rateLimitLeaderboard = (req, res, next) => {
  const ip = getClientIp(req);
  const now = Date.now();

  const bucket = rateLimitBuckets.get(ip) || {
    hits: [],
    lastSubmissionAt: 0,
  };

  bucket.hits = bucket.hits.filter(
    (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  if (
    bucket.lastSubmissionAt &&
    now - bucket.lastSubmissionAt < RATE_LIMIT_MIN_GAP_MS
  ) {
    return res.status(429).json({
      error: "Espera unos segundos antes de guardar otro resultado",
    });
  }

  if (bucket.hits.length >= RATE_LIMIT_MAX_SUBMISSIONS) {
    return res.status(429).json({
      error: "Demasiados envíos. Inténtalo más tarde",
    });
  }

  bucket.hits.push(now);
  bucket.lastSubmissionAt = now;
  rateLimitBuckets.set(ip, bucket);

  next();
};

setInterval(() => {
  const now = Date.now();

  for (const [ip, bucket] of rateLimitBuckets.entries()) {
    bucket.hits = bucket.hits.filter(
      (timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS
    );

    if (
      bucket.hits.length === 0 &&
      now - bucket.lastSubmissionAt > RATE_LIMIT_WINDOW_MS
    ) {
      rateLimitBuckets.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS).unref();

const sanitizeName = (value) => {
  return String(value || "")
    .normalize("NFKC")
    .replace(/[<>]/g, "")
    .replace(/[^\p{L}\p{N}\s._\-#@]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);
};

const cleanCountryCode = (value) => {
  const code = String(value || "ES")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 8);

  return code || "ES";
};

const toIntegerInRange = (value, min, max) => {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return null;
  }

  const integer = Math.trunc(number);

  if (integer < min || integer > max) {
    return null;
  }

  return integer;
};

const parseRecord = (value) => {
  const match = String(value || "")
    .trim()
    .match(/^([0-6])W-([0-1])L$/);

  if (!match) {
    return null;
  }

  const wins = Number(match[1]);
  const losses = Number(match[2]);
  const totalGames = wins + losses;

  if (totalGames < 1 || totalGames > 6) {
    return null;
  }

  if (losses === 0 && wins !== 6) {
    return null;
  }

  if (losses === 1 && wins > 5) {
    return null;
  }

  return {
    text: `${wins}W-${losses}L`,
    wins,
    losses,
  };
};

const calculateExpectedScore = ({ wins, kills, deaths, ovr, gameMode }) => {
  const baseScore = wins * 1200 + kills * 25 - deaths * 15 + ovr * 10;
  const multiplier = gameMode === "normal" ? 1 : 1.5;

  return Math.max(0, Math.round(baseScore * multiplier));
};

const validateLeaderboardPayload = (body) => {
  const name = sanitizeName(body.name);
  const countryCode = cleanCountryCode(body.countryCode);
  const parsedRecord = parseRecord(body.record);

  const kills = toIntegerInRange(body.kills, 0, 250);
  const deaths = toIntegerInRange(body.deaths, 0, 150);
  const score = toIntegerInRange(body.score, 0, VALID_SCORE_MAX);
  const ovr = toIntegerInRange(body.ovr, 1, 99);

  const gameMode = String(body.gameMode || "").trim();

  if (!name) {
    return { ok: false, error: "Nombre inválido" };
  }

  if (!parsedRecord) {
    return { ok: false, error: "Récord inválido" };
  }

  if (!ALLOWED_GAME_MODES.has(gameMode)) {
    return { ok: false, error: "Modo de juego inválido" };
  }

  if (kills === null || deaths === null || score === null || ovr === null) {
    return { ok: false, error: "Datos numéricos inválidos" };
  }

  const expectedScore = calculateExpectedScore({
    wins: parsedRecord.wins,
    kills,
    deaths,
    ovr,
    gameMode,
  });

  if (Math.abs(score - expectedScore) > SCORE_TOLERANCE) {
    return {
      ok: false,
      error: "Puntuación inválida",
    };
  }

  return {
    ok: true,
    data: {
      name,
      countryCode,
      record: parsedRecord.text,
      kills,
      deaths,
      score,
      gameMode,
      ovr,
      date: new Date().toISOString().split("T")[0],
    },
  };
};

const getTotalEntries = async () => {
  const [rows] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM leaderboard
    WHERE ${validLeaderboardWhere}
    `
  );

  return rows[0]?.total || 0;
};

const getEntryPosition = async ({ id, score, kills, deaths }) => {
  const [rows] = await db.query(
    `
    SELECT COUNT(*) + 1 AS position
    FROM leaderboard
    WHERE ${validLeaderboardWhere}
      AND (
        score > ?
        OR (score = ? AND kills > ?)
        OR (score = ? AND kills = ? AND deaths < ?)
        OR (score = ? AND kills = ? AND deaths = ? AND id < ?)
      )
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
  setNoStoreHeaders(res);

  res.json({
    message: "Backend funcionando correctamente",
    leaderboardModes: ["normal", "lecHard", "lcsHard"],
  });
});

app.get("/api/db-test", async (req, res) => {
  setNoStoreHeaders(res);

  if (process.env.ENABLE_DB_TEST !== "true") {
    return res.status(404).json({ error: "Not found" });
  }

  try {
    const [rows] = await db.query(
      "SELECT DATABASE() AS database_name, NOW() AS server_time"
    );

    res.json({
      success: true,
      result: rows,
      db: {
        DB_HOST_SET: !!process.env.DB_HOST,
        DB_PORT_SET: !!process.env.DB_PORT,
        DB_USER_SET: !!process.env.DB_USER,
        DB_NAME_SET: !!process.env.DB_NAME,
        DB_PASSWORD_SET: !!process.env.DB_PASSWORD,
      },
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
  setNoStoreHeaders(res);

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

app.get("/api/leaderboard/around/:id", async (req, res) => {
  setNoStoreHeaders(res);

  try {
    const id = Number(req.params.id);

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const [entryRows] = await db.query(
      `
      SELECT id, score, kills, deaths
      FROM leaderboard
      WHERE id = ?
        AND ${validLeaderboardWhere}
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

app.post("/api/leaderboard", rateLimitLeaderboard, async (req, res) => {
  setNoStoreHeaders(res);

  try {
    const validation = validateLeaderboardPayload(req.body);

    if (!validation.ok) {
      return res.status(400).json({ error: validation.error });
    }

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
    } = validation.data;

    const [result] = await db.query(
      `
      INSERT INTO leaderboard
      (name, countryCode, flag, \`record\`, kills, deaths, score, gameMode, ovr, \`date\`)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        name,
        countryCode,
        "",
        record,
        kills,
        deaths,
        score,
        gameMode,
        ovr,
        date,
      ]
    );

    const insertedId = result.insertId;

    const position = await getEntryPosition({
      id: insertedId,
      score,
      kills,
      deaths,
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
