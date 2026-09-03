import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      minlength: 3,
      maxlength: 100,
      required: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    imageUrl: {
      type: String,
      trim: true,
      match: [/^https?:\/\/\S+$/i, "imageUrl must be an http(s) URL"],
    },
    password: {
      type: String,
      minlength: 6,
      maxlength: 100,
      required: true,
      // never returned unless explicitly asked for with .select("+password")
      select: false,
    },
    biography: {
      type: String,
      default: "",
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
