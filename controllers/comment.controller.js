import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";

import mongoose from "mongoose";
import { fail } from "../utils/response.utils.js";

// Same projection post.controller.js uses when populating an author.
const authorFields = "name email biography";

const getComments = async (req, res) => {
  // #swagger.summary = 'Get all comments on a post (oldest first), author populated'
  // #swagger.responses[200] = { description: 'List of comments' }
  // #swagger.responses[401] = { description: 'Invalid or missing token' }
  // #swagger.responses[404] = { description: 'Post not found' }
  try {
    // does req.params.postId exist?
    const postExists = await Post.exists({ _id: req.params.postId });
    if (!postExists) {
      return fail(res, 404, "Post not found");
    }

    // get comments for post, sorted by createdAt ascending, with author populated
    const comments = await Comment.find({ post: req.params.postId })
      .sort({ createdAt: 1 })
      .populate("author", authorFields);
    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: comments,
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return fail(res, 500, "Failed to fetch comments");
  }
};

const getComment = async (req, res) => {
  // #swagger.summary = 'Get a single comment on a post, author populated'
  // #swagger.responses[200] = { description: 'The requested comment' }
  // #swagger.responses[404] = { description: 'Comment not found' }
  try {
    const comment = await Comment.findOne({
      _id: req.params.commentId,
      post: req.params.postId,
    }).populate("author", authorFields);

    if (!comment) {
      return fail(res, 404, "Comment not found");
    }

    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: comment,
    });
  } catch (error) {
    console.error("Error fetching comment:", error);
    return fail(res, 404, "Comment not found");
  }
};

const createComment = async (req, res) => {
  // #swagger.summary = 'Add a comment to a post as the authenticated user'
  /* #swagger.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["content"],
              properties: {
                content: { type: "string", example: "Great write-up, the populate() bit finally clicked." }
              }
            }
          }
        }
      } */
  // #swagger.responses[201] = { description: 'Comment created' }
  // #swagger.responses[400] = { description: 'Comment content is required' }
  // #swagger.responses[404] = { description: 'Post not found' }
  try {
    const { content } = req.body;

    const postExists = await Post.exists({ _id: req.params.postId });
    if (!postExists) {
      return fail(res, 404, "Post not found");
    }

    const comment = await Comment.create({
      content,
      post: req.params.postId,
      author: req.user._id,
    });
    const populated = await comment.populate("author", authorFields);

    res.status(201).json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: populated,
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    return fail(res, 500, "Failed to create comment");
  }
};

const updateComment = async (req, res) => {
  // #swagger.summary = "Update a comment's content (comment author only)"
  /* #swagger.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["content"],
              properties: {
                content: { type: "string", example: "Edited: the populate() bit finally clicked." }
              }
            }
          }
        }
      } */
  // #swagger.responses[200] = { description: 'Comment updated' }
  // #swagger.responses[404] = { description: 'Comment not found or not owned by user' }
  try {
    const { content } = req.body;

    const comment = await Comment.findOne({
      _id: req.params.commentId,
      post: req.params.postId,
      author: req.user._id,
    }).populate("author", authorFields);

    if (!comment) {
      return fail(res, 404, "Comment not found");
    }

    comment.content = content;
    await comment.save();

    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: comment,
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    return fail(res, 404, "Comment not found");
  }
};

const deleteComment = async (req, res) => {
  // #swagger.summary = 'Delete a comment (comment author, or admin)'
  // #swagger.responses[200] = { description: 'Comment deleted' }
  // #swagger.responses[403] = { description: 'Not allowed to delete this comment' }
  // #swagger.responses[404] = { description: 'Comment not found' }
  try {
    const comment = await Comment.findOne({
      _id: req.params.commentId,
      post: req.params.postId,
    }).populate("author", authorFields);

    if (!comment) {
      return fail(res, 404, "Comment not found");
    }

    const isCommentAuthor =
      comment.author._id.toString() === req.user._id.toString();
    const isAdmin = req.user.isAdmin;

    if (!isCommentAuthor && !isAdmin) {
      return fail(res, 403, "Not allowed to delete this comment");
    }

    await comment.deleteOne();

    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      message: "Comment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting comment:", error);
    return fail(res, 404, "Comment not found");
  }
};

export { getComments, getComment, createComment, updateComment, deleteComment };
