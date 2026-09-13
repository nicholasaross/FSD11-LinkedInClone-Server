import mongoose from "mongoose";

// a role is pinned to a month, not a day: nobody remembers the date they joined
// a board, and a full Date would drift across timezones for a field only ever
// rendered as "March 2019". as strings these also compare and sort with <
export const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const isMonth = (value) => MONTH_PATTERN.test(value);

// one line of a work history. embedded rather than a collection of its own: a
// role has no life outside the person who held it, is never queried on its own,
// and so rides along on every endpoint that already returns a user
const roleSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    company: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    // client-relative like the headshots, e.g. "assets/ms-logo.png", so the
    // front-end serves it from its own public folder
    companyLogoUrl: {
      type: String,
      trim: true,
    },
    start: {
      type: String,
      required: true,
      match: [MONTH_PATTERN, "start must be a month in YYYY-MM form"],
    },
    // null is the point of this field: it is how a role says "still there"
    end: {
      type: String,
      default: null,
      match: [MONTH_PATTERN, "end must be a month in YYYY-MM form"],
      validate: {
        // a plain function, not an arrow: `this` has to be the role itself for
        // the comparison to see the start it is being measured against
        validator: function (value) {
          return value == null || value >= this.start;
        },
        message: "end must not come before start",
      },
    },
  },
  { timestamps: true },
);

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
    // work history, embedded because a role belongs to exactly one person. no
    // index: nothing asks "who works at X" yet
    roles: [roleSchema],
    isAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

export default mongoose.model("User", userSchema);
