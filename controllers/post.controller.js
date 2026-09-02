import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import { fail, failFromError } from "../utils/response.utils.js";
import { setLike, withLikes } from "../utils/like.utils.js";
import { withCommentCounts } from "../utils/post.utils.js";
import mongoose from "mongoose";

const authorFields = "name email biography";

const getPosts = async (req, res) => {
  // #swagger.summary = 'Get all posts (newest first), author populated'
  // #swagger.responses[200] = { description: 'List of posts' }
  // #swagger.responses[401] = { description: 'Invalid or missing token' }
  try {
    // optional ?author=<id> filter, so a profile page can ask for one user's posts
    const filter = {};
    if (req.query.author) {
      if (!mongoose.Types.ObjectId.isValid(req.query.author)) {
        return fail(res, 400, "author must be a valid user id");
      }
      filter.author = req.query.author;
    }

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .populate("author", authorFields);
    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: await withCommentCounts(withLikes(posts, req.user._id)),
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    failFromError(res, error, 500, "Failed to fetch posts");
  }
};

const getPost = async (req, res) => {
  // #swagger.summary = 'Get a single post by ID, author populated'
  // #swagger.responses[200] = { description: 'The requested post' }
  // #swagger.responses[404] = { description: 'Post not found' }
  try {
    const post = await Post.findById(req.params.id).populate(
      "author",
      authorFields,
    );
    if (!post) {
      return fail(res, 404, "Post not found");
    }
    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: await withCommentCounts(withLikes(post, req.user._id)),
    });
  } catch (error) {
    console.error("Error fetching post:", error);
    failFromError(res, error, 500, "Failed to fetch post");
  }
};

const createPost = async (req, res) => {
  // #swagger.summary = 'Create a post authored by the authenticated user'
  /* #swagger.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["content"],
              properties: {
                content: { type: "string", example: "Just shipped the Mongoose refactor!" },
                imageUrl: { type: "string", example: "https://example.com/screenshot.png" }
              }
            }
          }
        }
      } */
  // #swagger.responses[201] = { description: 'Post created' }
  // #swagger.responses[400] = { description: 'Content is required, or imageUrl is not an http(s) URL' }
  try {
    const { content, imageUrl } = req.body;
    // || undefined so an empty string means "no picture" instead of failing the URL validator
    const post = await Post.create({
      content,
      imageUrl: imageUrl || undefined,
      author: req.user._id,
    });
    const populated = await post.populate("author", authorFields);
    res.status(201).json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: await withCommentCounts(withLikes(populated, req.user._id)),
    });
  } catch (error) {
    console.error("Error creating post:", error);
    failFromError(res, error, 500, "Failed to create post");
  }
};

const updatePost = async (req, res) => {
  // #swagger.summary = "Update a post's content or picture (author only)"
  /* #swagger.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                content: { type: "string", example: "Edited: shipped the refactor and the Swagger docs." },
                imageUrl: { type: "string", example: "https://example.com/screenshot.png", description: "Send null or an empty string to remove the picture." }
              }
            }
          }
        }
      } */
  // #swagger.responses[200] = { description: 'Post updated' }
  // #swagger.responses[400] = { description: 'imageUrl is not an http(s) URL' }
  // #swagger.responses[404] = { description: 'Post not found or not owned by user' }
  try {
    const { content, imageUrl } = req.body;

    // partial update; a null or empty imageUrl means remove the picture, which is $unset not $set
    const update = {};
    if (content !== undefined) update.$set = { content };
    if (imageUrl !== undefined) {
      if (imageUrl) update.$set = { ...update.$set, imageUrl };
      else update.$unset = { imageUrl: "" };
    }

    // only the author can edit their post
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, author: req.user._id },
      update,
      { returnDocument: "after", runValidators: true },
    ).populate("author", authorFields);

    if (!post) {
      return fail(res, 404, "Post not found");
    }

    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: await withCommentCounts(withLikes(post, req.user._id)),
    });
  } catch (error) {
    console.error("Error updating post:", error);
    failFromError(res, error, 404, "Post not found");
  }
};

const deletePost = async (req, res) => {
  // #swagger.summary = 'Delete a post (author only)'
  // #swagger.responses[200] = { description: 'Post deleted' }
  // #swagger.responses[404] = { description: 'Post not found or not owned by user' }
  try {
    // only the author can delete their post
    const result = await Post.deleteOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (result.deletedCount === 0) {
      return fail(res, 404, "Post not found");
    }

    // post is gone, remove its comments so they aren't orphaned
    await Comment.deleteMany({ post: req.params.id });

    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    failFromError(res, error, 404, "Post not found");
  }
};

const likePost = async (req, res) => {
  // #swagger.summary = 'Like a post as the authenticated user (idempotent)'
  // #swagger.responses[200] = { description: 'Post liked; returns the updated post' }
  // #swagger.responses[401] = { description: 'Invalid or missing token' }
  // #swagger.responses[404] = { description: 'Post not found' }
  try {
    await setLike(res, {
      Model: Post,
      filter: { _id: req.params.postId },
      userId: req.user._id,
      add: true,
      notFound: "Post not found",
      populate: authorFields,
      decorate: withCommentCounts,
    });
  } catch (error) {
    console.error("Error liking post:", error);
    failFromError(res, error, 500, "Failed to like post");
  }
};

const unlikePost = async (req, res) => {
  // #swagger.summary = 'Remove the authenticated user\'s like from a post (idempotent)'
  // #swagger.responses[200] = { description: 'Like removed; returns the updated post' }
  // #swagger.responses[401] = { description: 'Invalid or missing token' }
  // #swagger.responses[404] = { description: 'Post not found' }
  try {
    await setLike(res, {
      Model: Post,
      filter: { _id: req.params.postId },
      userId: req.user._id,
      add: false,
      notFound: "Post not found",
      populate: authorFields,
      decorate: withCommentCounts,
    });
  } catch (error) {
    console.error("Error unliking post:", error);
    failFromError(res, error, 500, "Failed to unlike post");
  }
};

export {
  getPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
};
