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

const POST_WINDOW_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

const randomInt = (max) => Math.floor(Math.random() * max);

// a random moment in the last `days` days, at a plausible hour of the day
const randomPastDate = (days) => {
  const now = Date.now();
  const date = new Date(now - randomInt(days) * DAY_MS);
  date.setHours(7 + randomInt(17), randomInt(60), randomInt(60), 0);

  // today's slot can roll past the current time; drop it back a day if so
  return date.getTime() > now ? new Date(date.getTime() - DAY_MS) : date;
};

const randomDateBetween = (start, end) =>
  new Date(start.getTime() + randomInt(end.getTime() - start.getTime() + 1));

const restoreDB = async (req, res) => {
  // #swagger.summary = 'Admin-only reseed of posts and comments for all non-admin users'
  // #swagger.description = 'Requires a Bearer token belonging to an administrator. Wipes every post and comment, then creates 5 posts per non-admin user and 0-3 comments on each, backdated to random times over the last 60 days.'
  // #swagger.responses[200] = { description: 'Successfully restored database with posts and comments' }
  // #swagger.responses[401] = { description: 'Invalid or missing API token' }
  // #swagger.responses[403] = { description: 'Admin privileges required' }
  // #swagger.responses[500] = { description: 'Failed to restore database' }

  try {
    const now = new Date();
    const users = await User.find({ isAdmin: false });

    const posts = [];
    for (const user of users) {
      posts.push(...curriculum.getPosts(user._id, 5));
    }

    // give roughly half the seeded posts a picsum.photos placeholder
    for (const [i, post] of posts.entries()) {
      if (Math.random() < 0.5) {
        post.imageUrl = `https://picsum.photos/seed/fsd${i}-${Date.now()}/600/400`;
      }
    }

    // scatter the posts back over the last couple of months so a feed sorted by
    // date looks lived-in rather than every post sharing one insert timestamp
    for (const post of posts) {
      post.createdAt = randomPastDate(POST_WINDOW_DAYS);
      post.updatedAt = post.createdAt;
    }
    posts.sort((a, b) => a.createdAt - b.createdAt);

    // wipe comments too: this bulk deleteMany bypasses the cascade in deletePost()
    await Comment.deleteMany({});
    await Post.deleteMany({});
    // timestamps: false so Mongoose keeps the dates above instead of stamping now
    const createdPosts = await Post.insertMany(posts, { timestamps: false });

    // built from the created posts, only those carry the _id a comment points at
    const comments = [];
    for (const post of createdPosts) {
      const commentCount = randomInt(4); // 0-3 per post
      for (let i = 0; i < commentCount; i++) {
        const commenter = users[randomInt(users.length)];
        const [comment] = curriculum.getComments(commenter._id, 1);
        // a reply lands somewhere between its post going up and now
        const createdAt = randomDateBetween(post.createdAt, now);
        comments.push({ ...comment, post: post._id, createdAt, updatedAt: createdAt });
      }
    }
    comments.sort((a, b) => a.createdAt - b.createdAt);
    const createdComments = await Comment.insertMany(comments, { timestamps: false });

    // random likers per doc, one bulkWrite per collection rather than a save() each
    const likeOps = (docs) =>
      docs.map((doc) => ({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: { likes: users.filter(() => Math.random() < 0.4).map((u) => u._id) },
          },
        },
      }));

    // timestamps: false again, otherwise the like pass resets every updatedAt
    if (createdPosts.length)
      await Post.bulkWrite(likeOps(createdPosts), { timestamps: false });
    if (createdComments.length)
      await Comment.bulkWrite(likeOps(createdComments), { timestamps: false });

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
