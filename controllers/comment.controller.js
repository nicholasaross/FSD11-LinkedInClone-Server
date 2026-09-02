import Comment from "../models/comment.model.js";
import Post from "../models/post.model.js";

import mongoose from "mongoose";
import { fail, failFromError } from "../utils/response.utils.js";
import { setLike, withLikes } from "../utils/like.utils.js";

// same projection post.controller.js uses when populating an author
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
      data: withLikes(comments, req.user._id),
    });
  } catch (error) {
    console.error("Error fetching comments:", error);
    return failFromError(res, error, 500, "Failed to fetch comments");
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
      data: withLikes(comment, req.user._id),
    });
  } catch (error) {
    console.error("Error fetching comment:", error);
    return failFromError(res, error, 404, "Comment not found");
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
      data: withLikes(populated, req.user._id),
    });
  } catch (error) {
    console.error("Error creating comment:", error);
    return failFromError(res, error, 500, "Failed to create comment");
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
      data: withLikes(comment, req.user._id),
    });
  } catch (error) {
    console.error("Error updating comment:", error);
    return failFromError(res, error, 404, "Comment not found");
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
    return failFromError(res, error, 404, "Comment not found");
  }
};

const likeComment = async (req, res) => {
  // #swagger.summary = 'Like a comment as the authenticated user (idempotent)'
  // #swagger.responses[200] = { description: 'Comment liked; returns the updated comment' }
  // #swagger.responses[401] = { description: 'Invalid or missing token' }
  // #swagger.responses[404] = { description: 'Comment not found' }
  try {
    // scoped by both ids so a valid comment id under the wrong post id 404s
    await setLike(res, {
      Model: Comment,
      filter: { _id: req.params.commentId, post: req.params.postId },
      userId: req.user._id,
      add: true,
      notFound: "Comment not found",
      populate: authorFields,
    });
  } catch (error) {
    console.error("Error liking comment:", error);
    failFromError(res, error, 500, "Failed to like comment");
  }
};

const unlikeComment = async (req, res) => {
  // #swagger.summary = 'Remove the authenticated user\'s like from a comment (idempotent)'
  // #swagger.responses[200] = { description: 'Like removed; returns the updated comment' }
  // #swagger.responses[401] = { description: 'Invalid or missing token' }
  // #swagger.responses[404] = { description: 'Comment not found' }
  try {
    await setLike(res, {
      Model: Comment,
      filter: { _id: req.params.commentId, post: req.params.postId },
      userId: req.user._id,
      add: false,
      notFound: "Comment not found",
      populate: authorFields,
    });
  } catch (error) {
    console.error("Error unliking comment:", error);
    failFromError(res, error, 500, "Failed to unlike comment");
  }
};

export {
  getComments,
  getComment,
  createComment,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
};
