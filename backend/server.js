import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const db = await mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Comprobar que el backend funciona
app.get("/", (req, res) => {
  res.json({ message: "Backend funcionando correctamente" });
});

// Obtener ranking
app.get("/api/leaderboard", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM leaderboard ORDER BY score DESC, wins DESC LIMIT 100"
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener el ranking" });
  }
});

// Guardar resultado
app.post("/api/leaderboard", async (req, res) => {
  try {
    const { username, team_name, players, coach, score, wins, losses } = req.body;

    if (!username || !players || score === undefined) {
      return res.status(400).json({ error: "Faltan datos obligatorios" });
    }

    const [result] = await db.query(
      `INSERT INTO leaderboard 
      (username, team_name, players, coach, score, wins, losses) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        username,
        team_name || null,
        JSON.stringify(players),
        coach || null,
        score,
        wins || 0,
        losses || 0,
      ]
    );

    res.json({
      success: true,
      id: result.insertId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al guardar el resultado" });
  }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`Servidor backend activo en puerto ${PORT}`);
});
