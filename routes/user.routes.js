import express from "express";
import {
  signup,
  login,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/user.controller.js";
import authenticate from "../middleware/auth.middleware.js";
import requireSelfOrAdmin from "../middleware/requireSelfOrAdmin.middleware.js";

const router = express.Router();

// Public: no token required to register or log in.
router.post("/signup", signup);
router.post("/login", login);

// Everything below requires a valid JWT.
router.get("/", authenticate, getAllUsers);
router.get("/:id", authenticate, getUserById);

// A user may only update or delete their own account (admins may do either).
router.put("/:id", authenticate, requireSelfOrAdmin, updateUser);
router.delete("/:id", authenticate, requireSelfOrAdmin, deleteUser);

export default router;
