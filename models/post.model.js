import mongoose from "mongoose";
import User from "./user.model.js";

const postSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      minlength: 3,
      maxlength: 280,
      required: true,
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: User,
      required: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
      },
    ],
  },
  { timestamps: true },
);

export default mongoose.model("Post", postSchema);
