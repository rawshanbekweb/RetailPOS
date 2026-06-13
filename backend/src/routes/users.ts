import { Router } from "express";
import { db, usersTable } from "../lib/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireRole, type AuthRequest } from "../middlewares/auth";
import { hashPassword } from "../lib/jwt";
import { logger } from "../lib/logger";

const router = Router();

router.get("/v1/users", requireAuth, requireRole("owner", "manager"), async (req: AuthRequest, res) => {
  try {
    const users = await db.select({
      id: usersTable.id, email: usersTable.email, role: usersTable.role,
      is_active: usersTable.is_active, created_at: usersTable.created_at,
    }).from(usersTable).where(eq(usersTable.store_id, req.user!.storeId));
    res.json({ users });
  } catch (err) {
    logger.error({ err }, "get users error");
    res.status(500).json({ detail: "Internal server error" });
  }
});

router.post("/v1/users", requireAuth, requireRole("owner"), async (req: AuthRequest, res) => {
  const { email, password, role } = req.body;
  if (!email || !password) { res.status(400).json({ detail: "email and password required" }); return; }
  try {
    const [user] = await db.insert(usersTable).values({
      store_id: req.user!.storeId, email,
      password_hash: hashPassword(password),
      role: role ?? "cashier",
    }).returning();
    res.status(201).json({ user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    logger.error({ err }, "create user error");
    res.status(500).json({ detail: "Internal server error" });
  }
});

export default router;
