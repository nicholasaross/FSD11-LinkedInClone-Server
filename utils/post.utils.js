import Comment from "../models/comment.model.js";

// adds commentCount to a post, or to an array of posts
export const withCommentCounts = async (postOrPosts) => {
  const posts = Array.isArray(postOrPosts) ? postOrPosts : [postOrPosts];
  const ids = posts.map((post) => post._id);

  const counts = await Comment.aggregate([
    { $match: { post: { $in: ids } } },
    { $group: { _id: "$post", count: { $sum: 1 } } },
  ]);

  const byPost = new Map(counts.map((c) => [c._id.toString(), c.count]));

  const withCount = posts.map((post) => ({
    ...post,
    commentCount: byPost.get(post._id.toString()) ?? 0,
  }));

  return Array.isArray(postOrPosts) ? withCount : withCount[0];
};
