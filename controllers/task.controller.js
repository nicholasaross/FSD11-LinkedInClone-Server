import { TASKS } from "../data/tasks.js";

// Monotonic id generator, seeded from the highest existing id so new tasks
// never reuse an id after deletes (TASKS.length + 1 could collide).
let nextId = TASKS.reduce((max, t) => Math.max(max, t.id), 0) + 1;

const defaultRoute = (req, res) => {
  res.json({ message: "Welcome to the Task Manager API",
    timestamp: new Date().toLocaleString()
   });
}

const getTasks = (req, res) => { 
  res.json({
	status: "success",
	timestamp: new Date().toLocaleString(),
	data: TASKS
  });
  res.on("finish", () => {
	console.log(`Response sent at: ${new Date().toLocaleString()}; response status: ${res.statusCode}`);
  });
}

const getTask = (req, res) => { 
  const taskId = parseInt(req.params.id);
  const task = TASKS.find(t => t.id === taskId);

  if (!task) {
    return res.status(404).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Task not found"
    });
  }

  res.json({
    status: "success",
    timestamp: new Date().toLocaleString(),
    data: task
  });
}

const createTask = (req, res) => {
  const { title, description } = req.body;

  const newTask = {
    id: nextId++,
    title,
    description,
    completed: false
  };
  TASKS.push(newTask);
  res.status(201).json({
    status: "success",
    timestamp: new Date().toLocaleString(),
    data: newTask
  });
}

const updateTask = (req, res) => {
  const taskId = parseInt(req.params.id);
  const task = TASKS.find(t => t.id === taskId);

  if (!task) {
    return res.status(404).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Task not found"
    });
  }

  const { title, description, completed } = req.body;
  if (title !== undefined) task.title = title;
  if (description !== undefined) task.description = description;
  if (completed !== undefined) task.completed = completed;

  res.json({
    status: "success",
    timestamp: new Date().toLocaleString(),
    data: task
  });
}

const deleteTask = (req, res) => {
  const taskId = parseInt(req.params.id);
  const taskIndex = TASKS.findIndex(t => t.id === taskId);
  if (taskIndex === -1) {
    return res.status(404).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Task not found"
    });
  }
  TASKS.splice(taskIndex, 1);
  res.json({
    status: "success",
    timestamp: new Date().toLocaleString(),
    message: "Task deleted successfully"
  });
}

export { defaultRoute, getTasks, getTask, createTask, updateTask, deleteTask }
