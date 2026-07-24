import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

// Verifies the Bearer JWT, loads the user from the database, and attaches
// the Mongoose user document to req.user for downstream handlers/middleware.
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Access denied. No token provided.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        status: "error",
        timestamp: new Date().toLocaleString(),
        message: "Invalid token.",
      });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Invalid token.",
    });
  }
};

export default authenticate;
export { authenticate, authenticate as isAuthenticated };
