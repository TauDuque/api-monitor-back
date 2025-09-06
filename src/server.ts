import express from "express";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client"; // Importe o PrismaClient
import Redis from "ioredis"; // Importe o ioredis

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const prisma = new PrismaClient(); // Instancie o PrismaClient
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379"); // Conecta ao Redis

redis.on("connect", () => {
  console.log("Connected to Redis!");
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

app.use(express.json());

app.get("/", async (req, res) => {
  try {
    // Teste a conexão com o banco de dados
    await prisma.$connect();
    res.send("Monitoring API is running and connected to DB!");
  } catch (error) {
    console.error("Failed to connect to DB:", error);
    res
      .status(500)
      .send("Monitoring API is running but failed to connect to DB.");
  } finally {
    await prisma.$disconnect(); // Desconecta após o teste
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
