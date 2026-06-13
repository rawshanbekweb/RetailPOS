import { Router } from "express";
import { db, salesTable, saleItemsTable, productsTable, syncLogTable } from "../lib/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

interface SaleItem {
  product_id: string; product_name: string; product_sku: string;
  unit_price: number; quantity: number; discount_amount: number; line_total: number;
}
interface BatchSale {
  sale_id: string; cashier_id: string; items: SaleItem[];
  subtotal: number; discount_total: number; total_amount: number;
  payment_method: "cash" | "card" | "mobile" | "mixed";
  client_created_at: string;
}

// GET /api/v1/sales
router.get("/v1/sales", requireAuth, async (req: AuthRequest, res) => {
  const storeId = req.user!.storeId;
  const limit   = Math.min(parseInt((req.query.limit as string) ?? "50"), 200);
  try {
    const sales = await db.select().from(salesTable)
      .where(eq(salesTable.store_id, storeId))
      .orderBy(desc(salesTable.created_at))
      .limit(limit);
    res.json({ sales });
  } catch (err) {
    logger.error({ err }, "get sales error");
    res.status(500).json({ detail: "Internal server error" });
  }
});

// POST /api/v1/sales/batch
router.post("/v1/sales/batch", requireAuth, async (req: AuthRequest, res) => {
  const storeId = req.user!.storeId;
  const { sales } = req.body as { sales: BatchSale[] };
  if (!Array.isArray(sales) || sales.length === 0) {
    res.status(400).json({ detail: "sales array required" }); return;
  }

  const results: { sale_id: string; status: "accepted" | "already_processed" | "failed"; error?: string }[] = [];

  for (const sale of sales) {
    try {
      const existing = await db.select({ id: salesTable.id }).from(salesTable)
        .where(eq(salesTable.id, sale.sale_id)).limit(1);
      if (existing.length > 0) {
        results.push({ sale_id: sale.sale_id, status: "already_processed" }); continue;
      }

      // Stock validation
      let stockError: string | null = null;
      for (const item of sale.items) {
        const [product] = await db.select().from(productsTable)
          .where(and(eq(productsTable.id, item.product_id), eq(productsTable.store_id, storeId))).limit(1);
        if (product && product.stock_quantity < item.quantity) { stockError = "insufficient_stock"; break; }
      }
      if (stockError) { results.push({ sale_id: sale.sale_id, status: "failed", error: stockError }); continue; }

      // Insert sale
      await db.insert(salesTable).values({
        id: sale.sale_id, store_id: storeId, cashier_id: sale.cashier_id,
        subtotal: String(sale.subtotal), discount_total: String(sale.discount_total),
        total_amount: String(sale.total_amount), payment_method: sale.payment_method,
        status: "completed", client_created_at: new Date(sale.client_created_at),
      });

      // Insert items + decrement stock
      for (const item of sale.items) {
        await db.insert(saleItemsTable).values({
          sale_id: sale.sale_id, product_id: item.product_id,
          product_name: item.product_name, product_sku: item.product_sku,
          unit_price: String(item.unit_price), quantity: item.quantity,
          discount_amount: String(item.discount_amount), line_total: String(item.line_total),
        });

        const [prod] = await db.select().from(productsTable)
          .where(eq(productsTable.id, item.product_id)).limit(1);
        if (prod) {
          await db.update(productsTable).set({
            stock_quantity: Math.max(0, prod.stock_quantity - item.quantity),
            updated_at: new Date(),
          }).where(eq(productsTable.id, item.product_id));
        }
      }

      await db.insert(syncLogTable).values({
        store_id: storeId, sale_id: sale.sale_id, status: "accepted",
      });

      results.push({ sale_id: sale.sale_id, status: "accepted" });
    } catch (err) {
      logger.error({ err, sale_id: sale.sale_id }, "batch sale error");
      results.push({ sale_id: sale.sale_id, status: "failed", error: "server_error" });
    }
  }

  res.json({ results });
});

export default router;
