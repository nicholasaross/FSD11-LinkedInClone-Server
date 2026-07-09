import { USERS } from "../data/users.js";
import curriculum from "../data/curriculum.js";
import { mongoCreateTasks } from "../data/mongoClient.js";

const defaultRoute = (req, res) => {
  res.json({
    message: "Welcome to the Multi-User Task Manager API",
    timestamp: new Date().toLocaleString(),
  });
};

const initialise = async (req, res) => {
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
      message: "Failed to create tasks",
    });
  }

  res.json({
    status: "success",
    timestamp: new Date().toLocaleString(),
    data: tasks,
  });
};

export { defaultRoute, initialise };
