import { Router } from "express";

const router = Router();

router.get("/v1/health", (_req, res) => { res.json({ status: "ok" }); });
router.head("/v1/health", (_req, res) => { res.sendStatus(200); });

export default router;
