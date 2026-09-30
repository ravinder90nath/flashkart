import "reflect-metadata";
import { db } from "./db";
import { User, Product } from "./entities";
async function main() {
  await db.initialize();
  const ur = db.getRepository(User),
    pr = db.getRepository(Product);
  let u = await ur.findOneBy({ email: "demo@flashkart.com" });
  if (!u) u = await ur.save(ur.create({ email: "demo@flashkart.com" }));
  let p = await pr.findOneBy({ name: "FlashKart Headphones" });
  if (!p)
    p = await pr.save(
      pr.create({
        name: "FlashKart Headphones",
        stock: 100,
        price: "1999.00",
        status: "ACTIVE",
      }),
    );
  console.log(JSON.stringify({ userId: u.id, productId: p.id }, null, 2));
  await db.destroy();
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
