import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column({ unique: true }) email!: string;
  @CreateDateColumn() createdAt!: Date;
  @OneToMany(() => Cart, (c) => c.user) carts!: Cart[];
  @OneToMany(() => Order, (o) => o.user) orders!: Order[];
}

@Entity("products")
export class Product {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Index() @Column() name!: string;
  @Column("integer") stock!: number;
  @Column({ type: "numeric", precision: 12, scale: 2 }) price!: string;
  @Column({ default: "ACTIVE" }) status!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}

@Entity("carts")
export class Cart {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() userId!: string;
  @Column({ default: "ACTIVE" }) status!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
  @ManyToOne(() => User, (u) => u.carts)
  @JoinColumn({ name: "userId" })
  user!: User;
  @OneToMany(() => CartItem, (i) => i.cart) items!: CartItem[];
}

@Entity("cart_items")
@Unique(["cartId", "productId"])
export class CartItem {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() cartId!: string;
  @Column() productId!: string;
  @Column("integer") quantity!: number;
  @ManyToOne(() => Cart, (c) => c.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "cartId" })
  cart!: Cart;
}

@Entity("reservations")
@Unique(["idempotencyKey"])
@Index(["productId", "status"])
@Index(["expiresAt"])
export class Reservation {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() userId!: string;
  @Column() productId!: string;
  @Column("integer") quantity!: number;
  @Column({ length: 20 }) status!: string;
  @Column("timestamptz") expiresAt!: Date;
  @Column({ length: 128 }) idempotencyKey!: string;
  @CreateDateColumn() createdAt!: Date;
  @UpdateDateColumn() updatedAt!: Date;
}

@Entity("orders")
@Index(["userId", "createdAt"])
export class Order {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() userId!: string;
  @Column({ unique: true, length: 128 }) idempotencyKey!: string;
  @Column({ type: "numeric", precision: 12, scale: 2 }) totalAmount!: string;
  @Column({ default: "CONFIRMED" }) status!: string;
  @CreateDateColumn() createdAt!: Date;
  @ManyToOne(() => User, (u) => u.orders)
  @JoinColumn({ name: "userId" })
  user!: User;
  @OneToMany(() => OrderItem, (i) => i.order) items!: OrderItem[];
}

@Entity("order_items")
export class OrderItem {
  @PrimaryGeneratedColumn("uuid") id!: string;
  @Column() orderId!: string;
  @Column() productId!: string;
  @Column("integer") quantity!: number;
  @Column({ type: "numeric", precision: 12, scale: 2 }) unitPrice!: string;
  @ManyToOne(() => Order, (o) => o.items, { onDelete: "CASCADE" })
  @JoinColumn({ name: "orderId" })
  order!: Order;
}
