import { Router } from "express";
import { defaultRoute, getTasks, getTask, createTask, updateTask, deleteTask } from "../controllers/task.controller.js";
import validateTask from "../middleware/validateTask.middleware.js";

const router = Router();

// GET / - Default route
router.get("/", (req, res) => defaultRoute(req, res));

// GET /tasks - Get all tasks
router.get("/tasks", (req, res) => getTasks(req, res));

//  GET /tasks/:id - Get a specific task by ID
router.get("/tasks/:id", (req, res) => getTask(req, res));

// POST /tasks - Create a new task
router.post("/tasks", validateTask, (req, res) => createTask(req, res));

// PATCH /tasks/:id - Update a specific task by ID (partial update)
router.patch("/tasks/:id", (req, res) => updateTask(req, res));

// DELETE /tasks/:id - Delete a specific task by ID
router.delete("/tasks/:id", (req, res) => deleteTask(req, res));

export default router;