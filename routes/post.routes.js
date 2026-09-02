import { Router } from "express";
import {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
} from "../controllers/post.controller.js";
import commentRoutes from "./comment.routes.js";
import validatePost from "../middleware/validatePost.middleware.js";
import authenticate from "../middleware/auth.middleware.js";

import mongoose from "mongoose";
import { fail } from "../utils/response.utils.js";

const router = Router();
router.use(authenticate); //	apply to all routes in this router

// both names guard the same thing: :id on the post routes, :postId on the
// nested comment and like routes
const guardPostId = (req, res, next, id) =>
  mongoose.Types.ObjectId.isValid(id)
    ? next()
    : fail(res, 404, "Post not found");

router.param("id", guardPostId);
router.param("postId", guardPostId);

// comments are a sub-resource, nested here so they inherit the authenticate above
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

// named :postId not :id so likes inherit the router.param guard above

// POST /posts/:postId/likes - Like a post
router.post("/:postId/likes", (req, res) => likePost(req, res));

// DELETE /posts/:postId/likes - Remove your like from a post
router.delete("/:postId/likes", (req, res) => unlikePost(req, res));

export default router;
