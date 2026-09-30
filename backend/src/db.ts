import "reflect-metadata";
import { DataSource } from "typeorm";
import {
  User,
  Product,
  Cart,
  CartItem,
  Reservation,
  Order,
  OrderItem,
} from "./entities";
import { config } from "./config";
export const db = new DataSource({
  type: "postgres",
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  entities: [User, Product, Cart, CartItem, Reservation, Order, OrderItem],
  synchronize: true,
});
