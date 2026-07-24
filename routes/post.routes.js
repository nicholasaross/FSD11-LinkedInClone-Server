import { Router } from "express";
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
} from "../controllers/post.controller.js";
import validatePost from "../middleware/validatePost.middleware.js";
import authenticate from "../middleware/auth.middleware.js";

const router = Router();
router.use(authenticate); //	apply to all routes in this router

// GET /posts - Get all posts
router.get("/", (req, res) => getPosts(req, res));

// GET /posts/:id - Get a specific post by ID
router.get("/:id", (req, res) => getPost(req, res));

// POST /posts - Create a new post
router.post("/", validatePost, (req, res) => createPost(req, res));

// PATCH /posts/:id - Update a specific post by ID (partial update)
router.patch("/:id", (req, res) => updatePost(req, res));

// DELETE /posts/:id - Delete a specific post by ID
router.delete("/:id", (req, res) => deletePost(req, res));

export default router;
