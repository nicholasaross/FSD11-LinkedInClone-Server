import "dotenv/config";
import { MongoClient, ServerApiVersion } from "mongodb";

const uri = `mongodb+srv://nicholasross_db_user:${process.env.DB_PASSWORD}@cluster0.ed0xajm.mongodb.net/?appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let tasksCollection;

async function getTasksCollection() {
  if (!tasksCollection) {
    await client.connect();
    tasksCollection = client.db("taskmanager").collection("tasks");
  }
  return tasksCollection;
}

const mongoGetTasks = async (req, res) => {
  const collection = await getTasksCollection();
  return collection.find({ userId: req.user.id }).toArray();
};

const mongoGetTaskById = async (req, res, id) => {
  const collection = await getTasksCollection();
  return collection.findOne({ id, userId: req.user.id });
};

const mongoCreateTask = async (task) => {
  const collection = await getTasksCollection();
  await collection.insertOne(task);
  return task;
};

const mongoCreateTasks = async (tasks) => {
  const collection = await getTasksCollection();
  await collection.insertMany(tasks);
  return tasks;
};

const mongoUpdateTask = async (req, res, id, updates) => {
  const collection = await getTasksCollection();
  return collection.findOneAndUpdate(
    { id, userId: req.user.id },
    { $set: updates },
    { returnDocument: "after" },
  );
};

const mongoDeleteTask = async (req, res, id) => {
  const collection = await getTasksCollection();
  const result = await collection.deleteOne({ id, userId: req.user.id });
  return result.deletedCount > 0;
};

const mongoDeleteAllTasks = async () => {
  const collection = await getTasksCollection();
  const result = await collection.deleteMany({});
  return result.deletedCount;
};

export {
  mongoGetTasks,
  mongoGetTaskById,
  mongoCreateTask,
  mongoCreateTasks,
  mongoUpdateTask,
  mongoDeleteTask,
  mongoDeleteAllTasks,
};
