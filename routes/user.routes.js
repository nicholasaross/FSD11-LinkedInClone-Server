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
import authenticate from "../middleware/auth.middleware.js";
import requireSelfOrAdmin from "../middleware/requireSelfOrAdmin.middleware.js";

import mongoose from "mongoose";
import { fail } from "../utils/response.utils.js";

const router = express.Router();

// stops a malformed id reaching the controller, where it would throw a CastError
router.param("id", (req, res, next, id) =>
  mongoose.Types.ObjectId.isValid(id) ? next() : fail(res, 404, "User not found"),
);

// public: no token required to register or log in
router.post("/signup", signup);
router.post("/login", login);

// everything below requires a valid JWT
router.get("/", authenticate, getAllUsers);

// must come before "/:id", which would otherwise capture "me" as an id
router.get("/me", authenticate, getMe);

router.get("/:id", authenticate, getUserById);

// a user may only update or delete their own account (admins may do either)
router.put("/:id", authenticate, requireSelfOrAdmin, updateUser);
router.delete("/:id", authenticate, requireSelfOrAdmin, deleteUser);

export default router;
