import { Router } from "express";
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
} from "../controllers/post.controller.js";
import commentRoutes from "./comment.routes.js";
import validatePost from "../middleware/validatePost.middleware.js";
import authenticate from "../middleware/auth.middleware.js";

import mongoose from "mongoose";
import { fail } from "../utils/response.utils.js";

const router = Router();
router.use(authenticate); //	apply to all routes in this router

router.param("postId", (req, res, next, id) =>
  mongoose.Types.ObjectId.isValid(id)
    ? next()
    : fail(res, 404, "Post not found"),
);

// Comments are a sub-resource of a post, so their router is nested here rather
// than mounted separately in index.js. Everything it handles lives under
// /posts/:postId/comments, and it inherits the authenticate above.
router.use("/:postId/comments", commentRoutes);

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
