import { Router } from "express";
import { defaultRoute, restoreDB } from "../controllers/admin.controller.js";
import authenticate from "../middleware/auth.middleware.js";
import requireAdmin from "../middleware/requireAdmin.middleware.js";

const router = Router();

// GET / - Default route
router.get("/", (req, res) => defaultRoute(req, res));

// GET /restore - Restore the database (authenticated and isAdmin only)
router.get("/restore", authenticate, requireAdmin, (req, res) =>
  restoreDB(req, res),
);

export default router;
