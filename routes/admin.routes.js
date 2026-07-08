import { Router } from "express";
import { defaultRoute, initialise } from "../controllers/admin.controller.js";

const router = Router();

// GET / - Default route
router.get("/", (req, res) => defaultRoute(req, res));

// GET /tasks - Get all tasks
router.get("/init", (req, res) => initialise(req, res));

export default router;
