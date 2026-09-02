import curriculum from "../models/curriculum.js";
import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import { fail } from "../utils/response.utils.js";

const defaultRoute = (req, res) => {
  // #swagger.summary = 'Basic service health check endpoint'
  // #swagger.description = 'Only unauthenticated endpoint (other than api-docs). Returns a welcome message and timestamp.'
  // #swagger.responses[200] = { description: 'Service is running and accessible' }
  // #swagger.security = []

  res.json({
    message: "Welcome to the Social Media App API",
    timestamp: new Date().toLocaleString(),
  });
};

const restoreDB = async (req, res) => {
  // #swagger.summary = 'Admin-only reseed of posts and comments for all non-admin users'
  // #swagger.description = 'Requires a Bearer token belonging to an administrator. Wipes every post and comment, then creates 5 posts per non-admin user and 0-3 comments on each.'
  // #swagger.responses[200] = { description: 'Successfully restored database with posts and comments' }
  // #swagger.responses[401] = { description: 'Invalid or missing API token' }
  // #swagger.responses[403] = { description: 'Admin privileges required' }
  // #swagger.responses[500] = { description: 'Failed to restore database' }

  try {
    const users = await User.find({ isAdmin: false });

    const posts = [];
    for (const user of users) {
      posts.push(...curriculum.getPosts(user._id, 5));
    }

    // Wipe comments as well as posts. deletePost() cascades, but this bulk
    // deleteMany() bypasses that, so clearing posts alone would leave every
    // comment orphaned against a post id that no longer exists.
    await Comment.deleteMany({});
    await Post.deleteMany({});
    const createdPosts = await Post.insertMany(posts);

    // Built from the CREATED posts, not from the input array: only the documents
    // returned by insertMany() carry the _id that a comment needs to point at.
    const comments = [];
    for (const post of createdPosts) {
      const commentCount = Math.floor(Math.random() * 4); // 0-3 per post
      for (let i = 0; i < commentCount; i++) {
        const commenter = users[Math.floor(Math.random() * users.length)];
        const [comment] = curriculum.getComments(commenter._id, 1);
        comments.push({ ...comment, post: post._id });
      }
    }
    const createdComments = await Comment.insertMany(comments);

    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: { posts: createdPosts, comments: createdComments },
    });
  } catch (error) {
    console.error("Error restoring database:", error);
    return fail(res, 500, "Failed to restore database");
  }
};

export { defaultRoute, restoreDB };
