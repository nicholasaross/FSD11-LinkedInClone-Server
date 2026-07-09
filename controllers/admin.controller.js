import { TASKS } from "../data/tasks.js";
import { USERS } from "../data/users.js";
import curriculum from "../data/curriculum.js";

const defaultRoute = (req, res) => {
  res.json({
    message: "Welcome to the Multi-User Task Manager API",
    timestamp: new Date().toLocaleString(),
  });
};

const initialise = (req, res) => {
  // Clear existing tasks
  TASKS.length = 0;

  // Add initial tasks
  for (const user of USERS) {
    if (!user.is_admin) {
      const userId = user.id;

      TASKS.push(curriculum.getTasks(userId, 5));
    }
  }

  res.json({
    status: "success",
    timestamp: new Date().toLocaleString(),
    data: TASKS,
  });
};

export { defaultRoute, initialise };
