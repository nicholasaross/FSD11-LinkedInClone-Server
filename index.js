import "dotenv/config";
import express from "express";
import adminRoutes from "./routes/admin.routes.js";
import taskRoutes from "./routes/task.routes.js";
import loggerMiddleware from "./middleware/logger.middleware.js";

const port = process.env.PORT || 3000;
const app = express();
app.disable("x-powered-by");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(loggerMiddleware);
app.use("/", adminRoutes);
app.use("/", taskRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
