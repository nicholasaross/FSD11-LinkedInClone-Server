import { fail } from "./response.utils.js";

// adds the derived like fields to a document, or to an array of documents
export const withLikes = (docOrDocs, userId) => {
  const one = (doc) => ({
    ...doc.toObject(),
    likeCount: doc.likes.length,
    likedByMe: doc.likes.some((id) => id.equals(userId)),
  });

  return Array.isArray(docOrDocs) ? docOrDocs.map(one) : one(docOrDocs);
};

// shared like/unlike write for any model carrying a `likes` array — used by both posts and comments
export const setLike = async (
  res,
  { Model, filter, userId, add, notFound, populate, decorate },
) => {
  const doc = await Model.findOneAndUpdate(
    filter,
    add ? { $addToSet: { likes: userId } } : { $pull: { likes: userId } },
    { returnDocument: "after" },
  ).populate("author", populate);

  if (!doc) {
    return fail(res, 404, notFound);
  }

  const data = withLikes(doc, userId);

  res.json({
    status: "success",
    timestamp: new Date().toLocaleString(),
    data: decorate ? await decorate(data) : data,
  });
};
