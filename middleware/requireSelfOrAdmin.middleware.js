// depends on the authentication middleware to set req.user
// allows the request only when the authenticated user is acting on their own
// account (req.params.id matches their id) or is Admin
const requireSelfOrAdmin = (req, res, next) => {
  const isSelf = req.user?._id?.toString() === req.params.id;
  if (isSelf || req.user?.isAdmin) {
    return next();
  }
  return res.status(403).json({
    status: "error",
    timestamp: new Date().toLocaleString(),
    message: "You can only modify your own account",
  });
};

export default requireSelfOrAdmin;
