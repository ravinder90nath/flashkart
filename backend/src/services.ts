import { randomUUID } from "crypto";
import { db } from "./db";
import { User, Product, Reservation, Order, OrderItem } from "./entities";
import { redis, RESERVE_LUA, RELEASE_LUA } from "./redis";
import { config } from "./config";
export async function reserveStock(
  userId: string,
  productId: string,
  quantity: number,
  key: string,
) {
  const rr = db.getRepository(Reservation);
  const existing = await rr.findOneBy({ idempotencyKey: key });
  if (existing) return existing;
  if (!Number.isInteger(quantity) || quantity <= 0)
    throw Error("INVALID_QUANTITY");
  if (!(await db.getRepository(User).findOneBy({ id: userId })))
    throw Error("USER_NOT_FOUND");
  const product = await db.getRepository(Product).findOneBy({ id: productId });
  if (!product) throw Error("PRODUCT_NOT_FOUND");
  if (product.status !== "ACTIVE") throw Error("PRODUCT_NOT_AVAILABLE");
  const reservationId = randomUUID(),
    expiresAt = new Date(Date.now() + config.reservationSeconds * 1000),
    stockKey = `stock:${productId}`,
    reservationKey = `reservation:${reservationId}`;
  if (!(await redis.exists(stockKey)))
    await redis.set(stockKey, String(product.stock));
  const result = (await redis.eval(RESERVE_LUA, {
    keys: [stockKey, reservationKey],
    arguments: [
      String(quantity),
      reservationId,
      String(expiresAt.getTime()),
      String(config.reservationSeconds),
    ],
  })) as number[];
  if (result[0] === -2) throw Error("STOCK_NOT_INITIALIZED");
  if (result[0] === -3) throw Error("INVALID_QUANTITY");
  if (result[0] === 0) throw Error("INSUFFICIENT_STOCK");
  try {
    return await rr.save(
      rr.create({
        id: reservationId,
        userId,
        productId,
        quantity,
        status: "ACTIVE",
        expiresAt,
        idempotencyKey: key,
      }),
    );
  } catch (e: any) {
    await redis.eval(RELEASE_LUA, {
      keys: [stockKey, reservationKey],
      arguments: [reservationId],
    });
    if (e?.code === "23505") {
      const same = await rr.findOneBy({ idempotencyKey: key });
      if (same) return same;
    }
    throw e;
  }
}
export async function checkout(
  userId: string,
  reservationId: string,
  key: string,
) {
  const or = db.getRepository(Order);
  const old = await or.findOneBy({ idempotencyKey: key });
  if (old) return old;
  return db.transaction(async (manager) => {
    const duplicate = await manager
      .getRepository(Order)
      .findOneBy({ idempotencyKey: key });
    if (duplicate) return duplicate;
    const r = await manager.getRepository(Reservation).findOne({
      where: { id: reservationId, userId },
      lock: { mode: "pessimistic_write" },
    });
    if (!r) throw Error("RESERVATION_NOT_FOUND");
    if (r.status !== "ACTIVE") throw Error("RESERVATION_NOT_ACTIVE");
    if (r.expiresAt <= new Date()) {
      r.status = "EXPIRED";
      await manager.save(r);
      throw Error("RESERVATION_EXPIRED");
    }
    const p = await manager
      .getRepository(Product)
      .findOneBy({ id: r.productId });
    if (!p) throw Error("PRODUCT_NOT_FOUND");
    const updated = await manager
      .getRepository(Product)
      .createQueryBuilder()
      .update(Product)
      .set({ stock: () => `stock - ${r.quantity}` })
      .where("id=:id", { id: p.id })
      .andWhere("stock>=:quantity", { quantity: r.quantity })
      .execute();
    if (updated.affected !== 1) throw Error("INSUFFICIENT_STOCK");
    const total = Number(p.price) * r.quantity;
    const order = await manager.getRepository(Order).save(
      manager.getRepository(Order).create({
        userId,
        idempotencyKey: key,
        totalAmount: total.toFixed(2),
        status: "CONFIRMED",
      }),
    );
    await manager.getRepository(OrderItem).save(
      manager.getRepository(OrderItem).create({
        orderId: order.id,
        productId: p.id,
        quantity: r.quantity,
        unitPrice: p.price,
      }),
    );
    r.status = "CONFIRMED";
    await manager.save(r);
    return order;
  });
}
export async function cleanupExpiredReservations() {
  const rows = await db
    .getRepository(Reservation)
    .createQueryBuilder("r")
    .where("r.status='ACTIVE'")
    .andWhere('"r"."expiresAt"<=NOW()')
    .limit(500)
    .getMany();
  for (const row of rows) {
    const changed = await db.transaction(async (m) => {
      const r = await m.getRepository(Reservation).findOne({
        where: { id: row.id },
        lock: { mode: "pessimistic_write" },
      });
      if (!r || r.status !== "ACTIVE" || r.expiresAt > new Date()) return false;
      r.status = "EXPIRED";
      await m.save(r);
      return true;
    });
    if (changed)
      await redis.eval(RELEASE_LUA, {
        keys: [`stock:${row.productId}`, `reservation:${row.id}`],
        arguments: [row.id],
      });
  }
}
