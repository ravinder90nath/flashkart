import "reflect-metadata";
import express from "express";
import cors from "cors";
import { z } from "zod";
import { db } from "./db";
import { redis } from "./redis";
import { config } from "./config";
import { Product } from "./entities";
import { reserveStock, checkout, cleanupExpiredReservations } from "./services";
const app = express();
app.use(cors());
app.use(express.json());
app.get("/health", (_req, res) => res.json({ status: "OK" }));
app.get("/api/demo", async (_req, res) => {
  const u = await db
    .getRepository(require("./entities").User)
    .findOneBy({ email: "demo@flashkart.com" });
  const p = await db
    .getRepository(Product)
    .findOneBy({ name: "FlashKart Headphones" });
  if (!u || !p) return res.status(404).json({ error: "DEMO_NOT_SEEDED" });
  res.json({ userId: u.id, productId: p.id });
});
app.get("/api/products/:id", async (req, res) => {
  const p = await db.getRepository(Product).findOneBy({ id: req.params.id });
  if (!p) return res.status(404).json({ error: "PRODUCT_NOT_FOUND" });
  res.json(p);
});
app.post("/api/cart/reserve", async (req, res) => {
  try {
    const b = z
      .object({
        userId: z.string().uuid(),
        productId: z.string().uuid(),
        quantity: z.number().int().positive().max(10),
      })
      .parse(req.body);
    const key = req.header("Idempotency-Key");
    if (!key)
      return res.status(400).json({ error: "IDEMPOTENCY_KEY_REQUIRED" });
    const r = await reserveStock(b.userId, b.productId, b.quantity, key);
    res
      .status(201)
      .json({ reservationId: r.id, status: r.status, expiresAt: r.expiresAt });
  } catch (e: any) {
    const msg = e?.message || "INTERNAL_ERROR";
    res.status(msg === "INSUFFICIENT_STOCK" ? 409 : 400).json({ error: msg });
  }
});
app.post("/api/order/checkout", async (req, res) => {
  try {
    const b = z
      .object({ userId: z.string().uuid(), reservationId: z.string().uuid() })
      .parse(req.body);
    const key = req.header("Idempotency-Key");
    if (!key)
      return res.status(400).json({ error: "IDEMPOTENCY_KEY_REQUIRED" });
    const o = await checkout(b.userId, b.reservationId, key);
    res.status(201).json(o);
  } catch (e: any) {
    res.status(409).json({ error: e?.message || "CHECKOUT_FAILED" });
  }
});
async function start() {
  await db.initialize();
  await redis.connect();
  setInterval(() => cleanupExpiredReservations().catch(console.error), 10000);
  app.listen(config.port, () =>
    console.log(`API running on http://localhost:${config.port}`),
  );
}
start().catch((e) => {
  console.error(e);
  process.exit(1);
});
