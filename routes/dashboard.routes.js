import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import {
  getDashboard,
  getAdminDashboard,
} from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/", isAuthenticated, getDashboard);
router.get("/admin", isAuthenticated, getAdminDashboard);

export default router;
