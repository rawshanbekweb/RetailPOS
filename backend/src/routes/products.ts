import { Router } from "express";
import { db, productsTable } from "../lib/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

// GET /api/v1/products
router.get("/v1/products", requireAuth, async (req: AuthRequest, res) => {
  const storeId      = req.user!.storeId;
  const updatedAfter = req.query.updated_after as string | undefined;
  try {
    const products = await db.select().from(productsTable).where(eq(productsTable.store_id, storeId));
    const filtered = updatedAfter
      ? products.filter(p => p.updated_at > new Date(updatedAfter))
      : products;
    res.json({ products: filtered, synced_at: new Date().toISOString() });
  } catch (err) {
    logger.error({ err }, "get products error");
    res.status(500).json({ detail: "Internal server error" });
  }
});

// POST /api/v1/products
router.post("/v1/products", requireAuth, async (req: AuthRequest, res) => {
  const storeId = req.user!.storeId;
  const { sku, name, price, stock_quantity, low_stock_threshold, is_active } = req.body;
  if (!sku || !name) { res.status(400).json({ detail: "sku and name are required" }); return; }
  try {
    const [product] = await db.insert(productsTable).values({
      store_id: storeId, sku: sku.toUpperCase(), name,
      price: String(price ?? 0),
      stock_quantity: stock_quantity ?? 0,
      low_stock_threshold: low_stock_threshold ?? 5,
      is_active: is_active ?? true,
    }).returning();
    res.status(201).json({ product });
  } catch (err) {
    logger.error({ err }, "create product error");
    res.status(500).json({ detail: "Internal server error" });
  }
});

// PUT /api/v1/products/:id
router.put("/v1/products/:id", requireAuth, async (req: AuthRequest, res) => {
  const storeId   = req.user!.storeId;
  const productId = req.params.id;
  const { sku, name, price, stock_quantity, low_stock_threshold, is_active } = req.body;
  try {
    const [product] = await db.update(productsTable)
      .set({
        ...(sku  !== undefined && { sku: sku.toUpperCase() }),
        ...(name !== undefined && { name }),
        ...(price !== undefined && { price: String(price) }),
        ...(stock_quantity !== undefined && { stock_quantity }),
        ...(low_stock_threshold !== undefined && { low_stock_threshold }),
        ...(is_active !== undefined && { is_active }),
        updated_at: new Date(),
      })
      .where(and(eq(productsTable.id, productId), eq(productsTable.store_id, storeId)))
      .returning();
    if (!product) { res.status(404).json({ detail: "Product not found" }); return; }
    res.json({ product });
  } catch (err) {
    logger.error({ err }, "update product error");
    res.status(500).json({ detail: "Internal server error" });
  }
});

export default router;
