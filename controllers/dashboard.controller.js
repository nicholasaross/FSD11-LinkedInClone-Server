import User from "../models/user.model.js";

export const getDashboard = async (req, res) => {
  // #swagger.summary = "Get the authenticated user's dashboard"
  // #swagger.responses[404] = { description: 'User not found' }
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdminDashboard = async (req, res) => {
  // #swagger.summary = 'Get the admin dashboard (admin only)'
  // #swagger.responses[403] = { description: 'Access denied' }
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Access denied" });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
