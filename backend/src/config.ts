import dotenv from "dotenv";
dotenv.config();
export const config = {
  port: Number(process.env.PORT || 5000),
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USER || "flashkart",
    password: process.env.DB_PASSWORD || "flashkart",
    database: process.env.DB_NAME || "flashkart",
  },
  redisUrl: process.env.REDIS_URL || "redis://localhost:6379",
  reservationSeconds: Number(process.env.RESERVATION_SECONDS || 300),
};
