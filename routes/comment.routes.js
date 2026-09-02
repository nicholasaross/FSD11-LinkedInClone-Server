import { Router } from "express";
import {
  getComments,
  getComment,
  createComment,
  updateComment,
  deleteComment,
} from "../controllers/comment.controller.js";
import validateComment from "../middleware/validateComment.middleware.js";

import mongoose from "mongoose";
import { fail } from "../utils/response.utils.js";

// mergeParams lets this router read :postId
const router = Router({ mergeParams: true });

router.param("commentId", (req, res, next, id) =>
  mongoose.Types.ObjectId.isValid(id)
    ? next()
    : fail(res, 404, "Comment not found"),
);

// Paths are relative to the parent's "/:postId/comments" mount, so "/" below is
// really /posts/:postId/comments.

// GET /posts/:postId/comments - Get all comments on a post
router.get("/", (req, res) => getComments(req, res));

// POST /posts/:postId/comments - Add a comment to a post
router.post("/", validateComment, (req, res) => createComment(req, res));

// GET /posts/:postId/comments/:commentId - Get a specific comment
router.get("/:commentId", (req, res) => getComment(req, res));

// PATCH /posts/:postId/comments/:commentId - Update a comment (author only)
router.patch("/:commentId", validateComment, (req, res) =>
  updateComment(req, res),
);

// DELETE /posts/:postId/comments/:commentId - Delete a comment (author and Admin only)
router.delete("/:commentId", (req, res) => deleteComment(req, res));

export default router;
