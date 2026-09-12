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
    // this user's portfolio, drawn from the shared skill catalogue. indexed on
    // the element so "everyone who can do X" stays a cheap query
    skills: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Skill",
        index: true,
      },
    ],
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
