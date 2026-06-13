import { Router } from "express";
import { db, storesTable, usersTable, refreshTokensTable } from "../lib/db";
import { eq } from "drizzle-orm";
import {
  signAccessToken, signRefreshToken, verifyToken,
  hashPassword, hashToken,
} from "../lib/jwt";
import { requireAuth, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router = Router();

// POST /api/v1/register
router.post("/v1/register", async (req, res) => {
  const { store_name, store_timezone, store_currency, email, password } = req.body;
  if (!store_name || !email || !password) {
    res.status(400).json({ detail: "store_name, email and password are required" });
    return;
  }
  try {
    const [store] = await db.insert(storesTable).values({
      name: store_name,
      timezone: store_timezone ?? "UTC",
      currency: store_currency ?? "UZS",
    }).returning();

    const [user] = await db.insert(usersTable).values({
      store_id: store.id, email,
      password_hash: hashPassword(password),
      role: "owner",
    }).returning();

    const payload = { userId: user.id, storeId: store.id, role: user.role };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await db.insert(refreshTokensTable).values({
      user_id:    user.id,
      token_hash: hashToken(refreshToken),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    res.status(201).json({ access_token: accessToken, refresh_token: refreshToken, user: { id: user.id, email: user.email, role: user.role }, store });
  } catch (err) {
    logger.error({ err }, "register error");
    res.status(500).json({ detail: "Internal server error" });
  }
});

// POST /api/v1/auth/login
router.post("/v1/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) { res.status(400).json({ detail: "email and password required" }); return; }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user || user.password_hash !== hashPassword(password)) {
      res.status(401).json({ detail: "Invalid credentials" }); return;
    }
    if (!user.is_active) { res.status(403).json({ detail: "Account deactivated" }); return; }

    const [store] = await db.select().from(storesTable).where(eq(storesTable.id, user.store_id)).limit(1);
    const payload = { userId: user.id, storeId: user.store_id, role: user.role };
    const accessToken  = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);

    await db.insert(refreshTokensTable).values({
      user_id:    user.id,
      token_hash: hashToken(refreshToken),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    res.json({ access_token: accessToken, refresh_token: refreshToken, user: { id: user.id, email: user.email, role: user.role }, store });
  } catch (err) {
    logger.error({ err }, "login error");
    res.status(500).json({ detail: "Internal server error" });
  }
});

// POST /api/v1/auth/refresh
router.post("/v1/auth/refresh", async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) { res.status(400).json({ detail: "refresh_token required" }); return; }

  try {
    const payload = verifyToken(refresh_token);
    const [stored] = await db.select().from(refreshTokensTable)
      .where(eq(refreshTokensTable.token_hash, hashToken(refresh_token))).limit(1);

    if (!stored || stored.revoked || stored.expires_at < new Date()) {
      res.status(401).json({ detail: "Invalid refresh token" }); return;
    }

    await db.update(refreshTokensTable).set({ revoked: true }).where(eq(refreshTokensTable.id, stored.id));

    const newAccess  = signAccessToken({ userId: payload.userId, storeId: payload.storeId, role: payload.role });
    const newRefresh = signRefreshToken({ userId: payload.userId, storeId: payload.storeId, role: payload.role });

    await db.insert(refreshTokensTable).values({
      user_id:    stored.user_id,
      token_hash: hashToken(newRefresh),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    res.json({ access_token: newAccess, refresh_token: newRefresh });
  } catch (err) {
    logger.error({ err }, "refresh error");
    res.status(401).json({ detail: "Invalid token" });
  }
});

// POST /api/v1/auth/logout
router.post("/v1/auth/logout", requireAuth, async (req: AuthRequest, res) => {
  const { refresh_token } = req.body;
  if (refresh_token) {
    await db.update(refreshTokensTable)
      .set({ revoked: true })
      .where(eq(refreshTokensTable.token_hash, hashToken(refresh_token)));
  }
  res.json({ detail: "Logged out" });
});

export default router;
