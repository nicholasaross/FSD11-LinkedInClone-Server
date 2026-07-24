import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const signup = async (req, res) => {
  // #swagger.summary = 'Register a new user'
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
  // #swagger.responses[201] = { description: 'User created' }
  // #swagger.responses[400] = { description: 'Missing required fields' }
  try {
    const { name, email, password, biography } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      biography,
    });
    await user.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    console.error("Error creating user", error);
    res.status(500).json({ error: "Internal server error" });
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
  // #swagger.responses[200] = { description: 'Authenticated; returns { token }' }
  // #swagger.responses[401] = { description: 'Invalid credentials' }
  // #swagger.responses[404] = { description: 'User not found' }
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.json({ token });
  } catch (error) {
    console.error("Error logging in", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getAllUsers = async (req, res) => {
  // #swagger.summary = 'List all users (passwords excluded)'
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    console.error("Error fetching users", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const getUserById = async (req, res) => {
  // #swagger.summary = 'Get a user by ID (password excluded)'
  // #swagger.responses[404] = { description: 'User not found' }
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error fetching user", error);
    res.status(500).json({ error: "Internal server error" });
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
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, biography },
      { new: true, runValidators: true },
    ).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    console.error("Error updating user", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

const deleteUser = async (req, res) => {
  // #swagger.summary = 'Delete a user'
  // #swagger.responses[200] = { description: 'User deleted' }
  // #swagger.responses[403] = { description: 'Not your account' }
  // #swagger.responses[404] = { description: 'User not found' }
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export { signup, login, getAllUsers, getUserById, updateUser, deleteUser };
