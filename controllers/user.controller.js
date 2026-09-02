import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import { fail, failFromError } from "../utils/response.utils.js";

// tokens last a week by default, override with JWT_EXPIRES_IN in .env
const tokenFor = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const succeed = (res, data, status = 200) =>
  res.status(status).json({
    status: "success",
    timestamp: new Date().toLocaleString(),
    data,
  });

const signup = async (req, res) => {
  // #swagger.summary = 'Register a new user and return a JWT'
  // #swagger.security = []
  /* #swagger.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "email", "password"],
              properties: {
                name: { type: "string", example: "Nick Ross" },
                email: { type: "string", example: "nick@example.com" },
                password: { type: "string", example: "s3cr3tpw" },
                biography: { type: "string", example: "FSD student" }
              }
            }
          }
        }
      } */
  // #swagger.responses[201] = { description: 'User created; returns { token, user }' }
  // #swagger.responses[400] = { description: 'Missing required fields or invalid values' }
  // #swagger.responses[409] = { description: 'Email already registered' }
  try {
    const { name, email, password, biography } = req.body;
    if (!name || !email || !password) {
      return fail(res, 400, "Missing required fields");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      biography,
    });

    // return a token so the client doesn't have to immediately POST to /login
    user.password = undefined;
    succeed(res, { token: tokenFor(user), user }, 201);
  } catch (error) {
    console.error("Error creating user", error);
    // 11000 is Mongo's duplicate-key code, here it can only be the unique email
    if (error.code === 11000) {
      return fail(res, 409, "Email already registered");
    }
    failFromError(res, error, 500, "Failed to create user");
  }
};

const login = async (req, res) => {
  // #swagger.summary = 'Log in with email and password, returns a JWT'
  // #swagger.security = []
  /* #swagger.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["email", "password"],
              properties: {
                email: { type: "string", example: "nick@example.com" },
                password: { type: "string", example: "s3cr3tpw" }
              }
            }
          }
        }
      } */
  // #swagger.responses[200] = { description: 'Authenticated; returns { token, user }' }
  // #swagger.responses[401] = { description: 'Invalid credentials' }
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return fail(res, 400, "Missing required fields");
    }

    // password is select:false in the schema, so it has to be asked for
    const user = await User.findOne({ email }).select("+password");
    // same message for unknown email and wrong password, so nobody can probe which emails exist
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return fail(res, 401, "Invalid credentials");
    }

    user.password = undefined;
    succeed(res, { token: tokenFor(user), user });
  } catch (error) {
    console.error("Error logging in", error);
    failFromError(res, error, 500, "Failed to log in");
  }
};

const getMe = async (req, res) => {
  // #swagger.summary = 'Get the authenticated user from their token'
  // #swagger.responses[200] = { description: 'The current user' }
  // #swagger.responses[401] = { description: 'Invalid or missing token' }
  // authenticate already loaded the user, nothing left to fetch
  succeed(res, req.user);
};

const getAllUsers = async (req, res) => {
  // #swagger.summary = 'List all users (passwords excluded)'
  try {
    const users = await User.find();
    succeed(res, users);
  } catch (error) {
    console.error("Error fetching users", error);
    failFromError(res, error, 500, "Failed to fetch users");
  }
};

const getUserById = async (req, res) => {
  // #swagger.summary = 'Get a user by ID (password excluded)'
  // #swagger.responses[404] = { description: 'User not found' }
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return fail(res, 404, "User not found");
    }
    succeed(res, user);
  } catch (error) {
    console.error("Error fetching user", error);
    failFromError(res, error, 404, "User not found");
  }
};

const updateUser = async (req, res) => {
  // #swagger.summary = 'Update a user'
  /* #swagger.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string", example: "Nick Ross" },
                email: { type: "string", example: "nick@example.com" },
                biography: { type: "string", example: "Updated bio" }
              }
            }
          }
        }
      } */
  // #swagger.responses[200] = { description: 'User updated' }
  // #swagger.responses[403] = { description: 'Not your account' }
  // #swagger.responses[404] = { description: 'User not found' }
  try {
    const { name, email, biography } = req.body;

    // partial update: only touch what the body mentions
    const set = {};
    if (name !== undefined) set.name = name;
    if (email !== undefined) set.email = email;
    if (biography !== undefined) set.biography = biography;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: set },
      { returnDocument: "after", runValidators: true },
    );
    if (!user) {
      return fail(res, 404, "User not found");
    }
    succeed(res, user);
  } catch (error) {
    console.error("Error updating user", error);
    failFromError(res, error, 404, "User not found");
  }
};

const deleteUser = async (req, res) => {
  // #swagger.summary = 'Delete a user, along with their posts, comments and likes'
  // #swagger.responses[200] = { description: 'User deleted' }
  // #swagger.responses[403] = { description: 'Not your account' }
  // #swagger.responses[404] = { description: 'User not found' }
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return fail(res, 404, "User not found");
    }

    // no foreign keys in Mongo, so their posts and comments would survive with an author that populates to null
    const ownPosts = await Post.find({ author: user._id }).select("_id");
    const ownPostIds = ownPosts.map((post) => post._id);

    const removed = {
      posts: (await Post.deleteMany({ author: user._id })).deletedCount,
      // their own comments, plus every comment left on the posts just deleted
      comments: (
        await Comment.deleteMany({
          $or: [{ author: user._id }, { post: { $in: ownPostIds } }],
        })
      ).deletedCount,
      // their likes elsewhere are stale references too
      postLikes: (
        await Post.updateMany(
          { likes: user._id },
          { $pull: { likes: user._id } },
        )
      ).modifiedCount,
      commentLikes: (
        await Comment.updateMany(
          { likes: user._id },
          { $pull: { likes: user._id } },
        )
      ).modifiedCount,
    };

    succeed(res, { message: "User deleted successfully", removed });
  } catch (error) {
    console.error("Error deleting user", error);
    failFromError(res, error, 404, "User not found");
  }
};

export {
  signup,
  login,
  getMe,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
};
