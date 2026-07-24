import Post from "../models/post.model.js";

const authorFields = "name email biography";

const getPosts = async (req, res) => {
  // #swagger.summary = 'Get all posts (newest first), author populated'
  // #swagger.responses[200] = { description: 'List of posts' }
  // #swagger.responses[401] = { description: 'Invalid or missing token' }
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate("author", authorFields);
    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: posts,
    });
  } catch (error) {
    console.error("Error fetching posts:", error);
    res.status(500).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Failed to fetch posts",
    });
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
      return res.status(404).json({
        status: "error",
        timestamp: new Date().toLocaleString(),
        message: "Post not found",
      });
    }
    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: post,
    });
  } catch (error) {
    console.error("Error fetching post:", error);
    res.status(404).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Post not found",
    });
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
                content: { type: "string", example: "Just shipped the Mongoose refactor!" }
              }
            }
          }
        }
      } */
  // #swagger.responses[201] = { description: 'Post created' }
  // #swagger.responses[400] = { description: 'Content is required' }
  try {
    const { content } = req.body;
    const post = await Post.create({ content, author: req.user._id });
    const populated = await post.populate("author", authorFields);
    res.status(201).json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: populated,
    });
  } catch (error) {
    console.error("Error creating post:", error);
    res.status(500).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Failed to create post",
    });
  }
};

const updatePost = async (req, res) => {
  // #swagger.summary = "Update a post's content (author only)"
  /* #swagger.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["content"],
              properties: {
                content: { type: "string", example: "Edited: shipped the refactor and the Swagger docs." }
              }
            }
          }
        }
      } */
  // #swagger.responses[200] = { description: 'Post updated' }
  // #swagger.responses[404] = { description: 'Post not found or not owned by user' }
  try {
    const { content } = req.body;
    // Only the author may edit their post.
    const post = await Post.findOneAndUpdate(
      { _id: req.params.id, author: req.user._id },
      { $set: { content } },
      { new: true, runValidators: true },
    ).populate("author", authorFields);

    if (!post) {
      return res.status(404).json({
        status: "error",
        timestamp: new Date().toLocaleString(),
        message: "Post not found",
      });
    }

    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: post,
    });
  } catch (error) {
    console.error("Error updating post:", error);
    res.status(404).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Post not found",
    });
  }
};

const deletePost = async (req, res) => {
  // #swagger.summary = 'Delete a post (author only)'
  // #swagger.responses[200] = { description: 'Post deleted' }
  // #swagger.responses[404] = { description: 'Post not found or not owned by user' }
  try {
    // Only the author may delete their post.
    const result = await Post.deleteOne({
      _id: req.params.id,
      author: req.user._id,
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        status: "error",
        timestamp: new Date().toLocaleString(),
        message: "Post not found",
      });
    }

    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      message: "Post deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting post:", error);
    res.status(404).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Post not found",
    });
  }
};

export { getPosts, getPost, createPost, updatePost, deletePost };
