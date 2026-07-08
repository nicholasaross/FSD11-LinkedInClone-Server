import { TASKS } from "../data/tasks.js";
import curriculum from "../data/curriculum.js";
import { randomUUID } from "crypto";

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
  for (let user = 1; user <= 3; user++) {
    const userId = randomUUID();

    TASKS.push(curriculum.getTasks(userId, 5));
  }

  res.json({
    status: "success",
    timestamp: new Date().toLocaleString(),
    data: TASKS,
  });
};

export { defaultRoute, initialise };
