import { USERS } from "../data/users.js";
import curriculum from "../data/curriculum.js";
import { mongoCreateTasks } from "../data/mongoClient.js";

const defaultRoute = (req, res) => {
  // #swagger.summary = 'Basic service health check endpoint'
  // #swagger.description = 'Only unauthenticated endpoint (other than api-docs). Returns a welcome message and timestamp.'
  // #swagger.responses[200] = { description: 'Service is running and accessible' }
  // #swagger.security = []

  res.json({
    message: "Welcome to the Multi-User Task Manager API",
    timestamp: new Date().toLocaleString(),
  });
};

const restoreDB = async (req, res) => {
  // #swagger.summary = 'Admin-only creation of tasks for all non-admin users'
  // #swagger.description = 'Requires a Bearer token belonging to an administrator.'
  // #swagger.responses[200] = { description: 'Successfully restored database with tasks for all non-admin users' }
  // #swagger.responses[401] = { description: 'Invalid or missing API token' }
  // #swagger.responses[403] = { description: 'Admin privileges required' }
  // #swagger.responses[500] = { description: 'Failed to restore database' }

  const tasks = [];

  for (const user of USERS) {
    if (!user.is_admin) {
      const userId = user.id;
      tasks.push(...curriculum.getTasks(userId, 5));
    }
  }

  try {
    await mongoCreateTasks(tasks);
  } catch (error) {
    console.error("Error creating tasks:", error);
    return res.status(500).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Failed to restore database",
    });
  }

  res.json({
    status: "success",
    timestamp: new Date().toLocaleString(),
    data: tasks,
  });
};

export { defaultRoute, restoreDB };
