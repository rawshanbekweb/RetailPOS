import { Router } from "express";
import { db, storesTable } from "../lib/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

router.get("/v1/store", requireAuth, async (req: AuthRequest, res) => {
  try {
    const [store] = await db.select().from(storesTable)
      .where(eq(storesTable.id, req.user!.storeId)).limit(1);
    if (!store) { res.status(404).json({ detail: "Store not found" }); return; }
    res.json(store);
  } catch (err) {
    logger.error({ err }, "get store error");
    res.status(500).json({ detail: "Internal server error" });
  }
});

router.put("/v1/store", requireAuth, requireRole("owner", "manager"), async (req: AuthRequest, res) => {
  const { name, timezone, currency, tax_rate, address, phone } = req.body;
  try {
    const [store] = await db.update(storesTable).set({
      ...(name     !== undefined && { name }),
      ...(timezone !== undefined && { timezone }),
      ...(currency !== undefined && { currency }),
      ...(tax_rate !== undefined && { tax_rate: String(tax_rate) }),
      ...(address  !== undefined && { address }),
      ...(phone    !== undefined && { phone }),
      updated_at: new Date(),
    }).where(eq(storesTable.id, req.user!.storeId)).returning();
    if (!store) { res.status(404).json({ detail: "Store not found" }); return; }
    res.json(store);
  } catch (err) {
    logger.error({ err }, "update store error");
    res.status(500).json({ detail: "Internal server error" });
  }
});

export default router;
