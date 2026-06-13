import {
  pgTable, pgEnum, uuid, varchar, text, boolean,
  integer, numeric, timestamp, index,
} from "drizzle-orm/pg-core";

export const userRoleEnum     = pgEnum("user_role",      ["owner", "manager", "cashier"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "card", "mobile", "mixed"]);
export const saleStatusEnum   = pgEnum("sale_status",    ["completed", "refunded", "voided"]);

export const storesTable = pgTable("stores", {
  id:         uuid("id").primaryKey().defaultRandom(),
  name:       varchar("name", { length: 255 }).notNull(),
  timezone:   varchar("timezone", { length: 100 }).notNull().default("UTC"),
  currency:   varchar("currency", { length: 10 }).notNull().default("UZS"),
  tax_rate:   numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  address:    text("address"),
  phone:      varchar("phone", { length: 50 }),
  is_active:  boolean("is_active").notNull().default(true),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
});

export const usersTable = pgTable("users", {
  id:            uuid("id").primaryKey().defaultRandom(),
  store_id:      uuid("store_id").notNull().references(() => storesTable.id),
  email:         varchar("email", { length: 255 }).notNull().unique(),
  password_hash: text("password_hash").notNull(),
  role:          userRoleEnum("role").notNull().default("cashier"),
  is_active:     boolean("is_active").notNull().default(true),
  created_at:    timestamp("created_at").notNull().defaultNow(),
  updated_at:    timestamp("updated_at").notNull().defaultNow(),
}, (t) => [index("users_store_idx").on(t.store_id)]);

export const refreshTokensTable = pgTable("refresh_tokens", {
  id:         uuid("id").primaryKey().defaultRandom(),
  user_id:    uuid("user_id").notNull().references(() => usersTable.id),
  token_hash: text("token_hash").notNull().unique(),
  expires_at: timestamp("expires_at").notNull(),
  revoked:    boolean("revoked").notNull().default(false),
  created_at: timestamp("created_at").notNull().defaultNow(),
});

export const productsTable = pgTable("products", {
  id:                  uuid("id").primaryKey().defaultRandom(),
  store_id:            uuid("store_id").notNull().references(() => storesTable.id),
  sku:                 varchar("sku", { length: 100 }).notNull(),
  name:                varchar("name", { length: 255 }).notNull(),
  price:               numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
  stock_quantity:      integer("stock_quantity").notNull().default(0),
  low_stock_threshold: integer("low_stock_threshold").notNull().default(5),
  is_active:           boolean("is_active").notNull().default(true),
  created_at:          timestamp("created_at").notNull().defaultNow(),
  updated_at:          timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("products_store_idx").on(t.store_id),
  index("products_sku_idx").on(t.store_id, t.sku),
]);

export const salesTable = pgTable("sales", {
  id:                uuid("id").primaryKey(),
  store_id:          uuid("store_id").notNull().references(() => storesTable.id),
  cashier_id:        uuid("cashier_id").notNull().references(() => usersTable.id),
  subtotal:          numeric("subtotal",       { precision: 12, scale: 2 }).notNull(),
  discount_total:    numeric("discount_total", { precision: 12, scale: 2 }).notNull().default("0"),
  total_amount:      numeric("total_amount",   { precision: 12, scale: 2 }).notNull(),
  payment_method:    paymentMethodEnum("payment_method").notNull(),
  status:            saleStatusEnum("status").notNull().default("completed"),
  client_created_at: timestamp("client_created_at").notNull(),
  created_at:        timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("sales_store_idx").on(t.store_id)]);

export const saleItemsTable = pgTable("sale_items", {
  id:              uuid("id").primaryKey().defaultRandom(),
  sale_id:         uuid("sale_id").notNull().references(() => salesTable.id),
  product_id:      uuid("product_id").notNull(),
  product_name:    varchar("product_name", { length: 255 }).notNull(),
  product_sku:     varchar("product_sku",  { length: 100 }).notNull(),
  unit_price:      numeric("unit_price",      { precision: 12, scale: 2 }).notNull(),
  quantity:        integer("quantity").notNull(),
  discount_amount: numeric("discount_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  line_total:      numeric("line_total",       { precision: 12, scale: 2 }).notNull(),
});

export const syncLogTable = pgTable("sync_log", {
  id:         uuid("id").primaryKey().defaultRandom(),
  store_id:   uuid("store_id").notNull(),
  sale_id:    uuid("sale_id").notNull(),
  status:     varchar("status", { length: 50 }).notNull(),
  created_at: timestamp("created_at").notNull().defaultNow(),
});
