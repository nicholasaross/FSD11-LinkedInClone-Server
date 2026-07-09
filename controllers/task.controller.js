import { randomUUID } from "node:crypto";
import {
  mongoGetTasks,
  mongoGetTaskById,
  mongoCreateTask,
  mongoUpdateTask,
  mongoDeleteTask,
} from "../data/mongoClient.js";

const getTasks = async (req, res) => {
  try {
    const tasks = await mongoGetTasks(req, res);
    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: tasks,
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Failed to fetch tasks",
    });
  }
};

const getTask = async (req, res) => {
  const taskId = req.params.id;
  const task = await mongoGetTaskById(req, res, taskId);

  if (!task) {
    return res.status(404).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Task not found",
    });
  }

  res.json({
    status: "success",
    timestamp: new Date().toLocaleString(),
    data: task,
  });
};

const createTask = async (req, res) => {
  const { title, description } = req.body;

  const newTask = {
    id: randomUUID(),
    title,
    description,
    completed: false,
    userId: req.user.id,
  };

  await mongoCreateTask(newTask);
  res.status(201).json({
    status: "success",
    timestamp: new Date().toLocaleString(),
    data: newTask,
  });
};

const updateTask = async (req, res) => {
  const taskId = req.params.id;
  const { title, description, completed } = req.body;

  const updates = {};
  if (title !== undefined) updates.title = title;
  if (description !== undefined) updates.description = description;
  if (completed !== undefined) updates.completed = completed;

  const updatedTask = await mongoUpdateTask(req, res, taskId, updates);

  if (!updatedTask) {
    return res.status(404).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Task not found",
    });
  }

  res.json({
    status: "success",
    timestamp: new Date().toLocaleString(),
    data: updatedTask,
  });
};

const deleteTask = async (req, res) => {
  const taskId = req.params.id;
  const deleted = await mongoDeleteTask(req, res, taskId);

  if (!deleted) {
    return res.status(404).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Task not found",
    });
  }

  res.json({
    status: "success",
    timestamp: new Date().toLocaleString(),
    message: "Task deleted successfully",
  });
};

export { getTasks, getTask, createTask, updateTask, deleteTask };
