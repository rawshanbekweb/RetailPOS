import { Router } from "express";
import authRoutes     from "./auth";
import productRoutes  from "./products";
import salesRoutes    from "./sales";
import storeRoutes    from "./store";
import userRoutes     from "./users";
import analyticsRoutes from "./analytics";
import healthRoutes   from "./health";

const router = Router();

router.use(healthRoutes);
router.use(authRoutes);
router.use(productRoutes);
router.use(salesRoutes);
router.use(storeRoutes);
router.use(userRoutes);
router.use(analyticsRoutes);

export default router;
