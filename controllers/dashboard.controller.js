import { fail, failFromError } from "../utils/response.utils.js";

const succeed = (res, data) =>
  res.json({
    status: "success",
    timestamp: new Date().toLocaleString(),
    data,
  });

export const getDashboard = async (req, res) => {
  // #swagger.summary = "Get the authenticated user's dashboard"
  // #swagger.responses[200] = { description: 'The current user' }
  // #swagger.responses[401] = { description: 'Invalid or missing token' }
  try {
    // authenticate already attached the user, no need to re-fetch by id
    succeed(res, { user: req.user });
  } catch (error) {
    console.error("Error fetching dashboard", error);
    failFromError(res, error, 500, "Failed to fetch dashboard");
  }
};

export const getAdminDashboard = async (req, res) => {
  // #swagger.summary = 'Get the admin dashboard (admin only)'
  // #swagger.responses[200] = { description: 'The current admin user' }
  // #swagger.responses[403] = { description: 'Access denied' }
  try {
    if (!req.user?.isAdmin) {
      return fail(res, 403, "Admin privileges required");
    }
    succeed(res, { user: req.user });
  } catch (error) {
    console.error("Error fetching admin dashboard", error);
    failFromError(res, error, 500, "Failed to fetch admin dashboard");
  }
};
