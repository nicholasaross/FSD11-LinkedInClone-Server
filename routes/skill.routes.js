import { Router } from "express";
import {
  getSkills,
  getSkill,
  createSkill,
  updateSkill,
  deleteSkill,
  getSkillUsers,
} from "../controllers/skill.controller.js";
import validateSkill from "../middleware/validateSkill.middleware.js";
import authenticate from "../middleware/auth.middleware.js";

import mongoose from "mongoose";
import { fail } from "../utils/response.utils.js";

const router = Router();
router.use(authenticate); //	apply to all routes in this router

// stops a malformed id reaching the controller, where it would throw a CastError
router.param("id", (req, res, next, id) =>
  mongoose.Types.ObjectId.isValid(id) ? next() : fail(res, 404, "Skill not found"),
);

// GET /skills - Get the catalogue, optionally filtered by ?category= and ?q=
router.get("/", (req, res) => getSkills(req, res));

// POST /skills - Add a new skill to the shared catalogue
router.post("/", validateSkill, (req, res) => createSkill(req, res));

// GET /skills/:id - Get a specific skill by ID
router.get("/:id", (req, res) => getSkill(req, res));

// PUT /skills/:id - Rename or recategorise a skill (creator or admin)
router.put("/:id", (req, res) => updateSkill(req, res));

// DELETE /skills/:id - Delete a skill and pull it from every portfolio (creator or admin)
router.delete("/:id", (req, res) => deleteSkill(req, res));

// GET /skills/:id/users - Everyone who holds this skill
router.get("/:id/users", (req, res) => getSkillUsers(req, res));

export default router;
