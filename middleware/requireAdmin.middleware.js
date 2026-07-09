// depends on the authentication middleware to set req.user
const requireAdmin = (req, res, next) => {
  if (!req.user?.is_admin) {
    return res.status(403).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Admin privileges required",
    });
  }
  next();
};

export default requireAdmin;
