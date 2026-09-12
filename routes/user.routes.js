import express from "express";
import {
  signup,
  login,
  getMe,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/user.controller.js";
import { getConnectionsForUser } from "../controllers/connection.controller.js";
import {
  getUserSkills,
  addUserSkill,
  removeUserSkill,
} from "../controllers/skill.controller.js";
import authenticate from "../middleware/auth.middleware.js";
import requireSelfOrAdmin from "../middleware/requireSelfOrAdmin.middleware.js";

import mongoose from "mongoose";
import { fail } from "../utils/response.utils.js";

const router = express.Router();

// stops a malformed id reaching the controller, where it would throw a CastError
router.param("id", (req, res, next, id) =>
  mongoose.Types.ObjectId.isValid(id) ? next() : fail(res, 404, "User not found"),
);

// the skill half of /users/:id/skills/:skillId needs its own guard, and its own
// "not found" wording
router.param("skillId", (req, res, next, skillId) =>
  mongoose.Types.ObjectId.isValid(skillId)
    ? next()
    : fail(res, 404, "Skill not found"),
);

// public: no token required to register or log in
router.post("/signup", signup);
router.post("/login", login);

// everything below requires a valid JWT
router.get("/", authenticate, getAllUsers);

// must come before "/:id", which would otherwise capture "me" as an id
router.get("/me", authenticate, getMe);

router.get("/:id", authenticate, getUserById);

// lives here rather than in the connection routes so it inherits the id guard
// above, which answers a malformed id with "User not found" rather than a cast error
router.get("/:id/connections", authenticate, getConnectionsForUser);

// a portfolio is public to anyone logged in, like the profile it belongs to, but
// only its owner (or an admin) may change it
router.get("/:id/skills", authenticate, getUserSkills);
router.post("/:id/skills", authenticate, requireSelfOrAdmin, addUserSkill);
router.delete(
  "/:id/skills/:skillId",
  authenticate,
  requireSelfOrAdmin,
  removeUserSkill,
);

// a user may only update or delete their own account (admins may do either)
router.put("/:id", authenticate, requireSelfOrAdmin, updateUser);
router.delete("/:id", authenticate, requireSelfOrAdmin, deleteUser);

export default router;
