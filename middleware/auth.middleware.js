import { USERS } from "../data/users.js";

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  const user = token && USERS.find((u) => u.api_token === token);
  if (!user) {
    return res.status(401).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Invalid or missing API token",
    });
  }

  req.user = user;
  next();
};

export default authenticate;
