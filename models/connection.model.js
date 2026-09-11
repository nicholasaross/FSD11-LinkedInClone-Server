import mongoose from "mongoose";

const connectionSchema = new mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // rejecting deletes the record, so "rejected" is never a stored state
    status: {
      type: String,
      enum: ["pending", "accepted"],
      default: "pending",
    },
  },
  { timestamps: true },
);

// one record per ordered pair; the controller rejects the reverse direction too
connectionSchema.index({ requester: 1, recipient: 1 }, { unique: true });

export default mongoose.model("Connection", connectionSchema);
