import { TASKS } from "../data/tasks.js";

const defaultRoute = (req, res) => {
  res.json({ message: "Welcome to the Multi-User Task Manager API",
    timestamp: new Date().toLocaleString()
   });
}

const initialise = (req, res) => {
  // Clear existing tasks
  TASKS.length = 0;

  // Add initial tasks
  TASKS.push(
	{ id: 1, title: "Task 1", description: "Description for Task 1", completed: false },
	{ id: 2, title: "Task 2", description: "Description for Task 2", completed: true },
	{ id: 3, title: "Task 3", description: "Description for Task 3", completed: false }
  );

  res.json({
	status: "success",
	timestamp: new Date().toLocaleString(),
	data: TASKS
  });
}
