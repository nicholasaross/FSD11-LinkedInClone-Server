import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      minlength: 3,
      maxlength: 280,
      required: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/\S+$/i, "imageUrl must be an http(s) URL"],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model("Post", postSchema);
