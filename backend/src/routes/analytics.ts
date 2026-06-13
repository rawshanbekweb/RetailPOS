import { Router } from "express";
import { db, salesTable, saleItemsTable } from "../lib/db";
import { eq, and } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

router.get("/v1/analytics", requireAuth, requireRole("owner", "manager"), async (req: AuthRequest, res) => {
  const storeId = req.user!.storeId;
  const now   = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const ago7  = new Date(today); ago7.setDate(ago7.getDate() - 7);
  const ago30 = new Date(today); ago30.setDate(ago30.getDate() - 30);

  try {
    const allSales = await db.select().from(salesTable)
      .where(and(eq(salesTable.store_id, storeId), eq(salesTable.status, "completed")));

    const periodSummary = (since: Date) => {
      const items   = allSales.filter(s => s.client_created_at >= since);
      const revenue = items.reduce((sum, s) => sum + parseFloat(s.total_amount), 0);
      return {
        sale_count:      items.length,
        revenue:         revenue.toFixed(2),
        avg_transaction: items.length > 0 ? (revenue / items.length).toFixed(2) : "0.00",
      };
    };

    const dailyMap: Record<string, { sale_count: number; revenue: number }> = {};
    for (const s of allSales.filter(s => s.client_created_at >= ago30)) {
      const day = s.client_created_at.toISOString().slice(0, 10);
      if (!dailyMap[day]) dailyMap[day] = { sale_count: 0, revenue: 0 };
      dailyMap[day].sale_count++;
      dailyMap[day].revenue += parseFloat(s.total_amount);
    }
    const daily = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({ day, sale_count: v.sale_count, revenue: v.revenue.toFixed(2) }));

    const recentIds = allSales.filter(s => s.client_created_at >= ago30).map(s => s.id);
    const topMap: Record<string, { name: string; sku: string; units: number; revenue: number }> = {};

    if (recentIds.length > 0) {
      const allItems = await db.select().from(saleItemsTable);
      for (const item of allItems.filter(i => recentIds.includes(i.sale_id))) {
        if (!topMap[item.product_id]) topMap[item.product_id] = { name: item.product_name, sku: item.product_sku, units: 0, revenue: 0 };
        topMap[item.product_id].units   += item.quantity;
        topMap[item.product_id].revenue += parseFloat(item.line_total);
      }
    }

    const top_products = Object.values(topMap)
      .sort((a, b) => b.units - a.units).slice(0, 10)
      .map(p => ({ product_name: p.name, product_sku: p.sku, units_sold: p.units, revenue: p.revenue.toFixed(2) }));

    res.json({ today: periodSummary(today), last_7_days: periodSummary(ago7), last_30_days: periodSummary(ago30), daily, top_products });
  } catch (err) {
    logger.error({ err }, "analytics error");
    res.status(500).json({ detail: "Internal server error" });
  }
});

export default router;
