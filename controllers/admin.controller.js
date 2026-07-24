import curriculum from "../models/curriculum.js";
import User from "../models/user.model.js";
import Post from "../models/post.model.js";

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
  // #swagger.summary = 'Admin-only creation of posts for all non-admin users'
  // #swagger.description = 'Requires a Bearer token belonging to an administrator.'
  // #swagger.responses[200] = { description: 'Successfully restored database with posts for all non-admin users' }
  // #swagger.responses[401] = { description: 'Invalid or missing API token' }
  // #swagger.responses[403] = { description: 'Admin privileges required' }
  // #swagger.responses[500] = { description: 'Failed to restore database' }

  try {
    const users = await User.find({ isAdmin: false });

    const posts = [];
    for (const user of users) {
      posts.push(...curriculum.getPosts(user._id, 5));
    }

    await Post.deleteMany({});
    const created = await Post.insertMany(posts);

    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: created,
    });
  } catch (error) {
    console.error("Error creating posts:", error);
    return res.status(500).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Failed to restore database",
    });
  }
};

export { defaultRoute, restoreDB };
