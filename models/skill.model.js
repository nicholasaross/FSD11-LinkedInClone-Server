import mongoose from "mongoose";

// the three buckets a skill can belong to. "extreme" covers the hobbies people
// list to look interesting: bare knuckle boxing, volcano boarding and the like
export const SKILL_CATEGORIES = ["technical", "business", "extreme"];

// "C#" -> "c#", "MERN  Stack" -> "mern stack": a case-insensitive uniqueness key
// that leaves symbols alone, so C# and C++ stay distinct. A URL-style slug would
// strip both down to "c" and collide
export const keyFor = (name) =>
  String(name).trim().toLowerCase().replace(/\s+/g, " ");

const skillSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    // derived from name, never sent by a client
    key: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    category: { type: String, enum: SKILL_CATEGORIES, required: true },
    // absent on the seeded catalogue: those belong to the house, not a user
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export default mongoose.model("Skill", skillSchema);
