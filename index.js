import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import loggerMiddleware from "./middleware/logger.middleware.js";
import { createRequire } from "module";
import swaggerUi from "swagger-ui-express";
import adminRoutes from "./routes/admin.routes.js";
import postRoutes from "./routes/post.routes.js";
import userRoutes from "./routes/user.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

const require = createRequire(import.meta.url);
const swaggerFile = require("./swagger-output.json");

const port = process.env.PORT || 3000;

const mongoUri = `mongodb+srv://nicholasross_db_user:${process.env.DB_PASSWORD}@cluster0.ed0xajm.mongodb.net/social-media-app-v2?retryWrites=true&w=majority&appName=social-media-app-v2`;

const app = express();
app.disable("x-powered-by");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Swagger UI at /api-docs BEFORE the routes to ensure it is accessible without authentication
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use(loggerMiddleware);
app.use("/", adminRoutes);
app.use("/posts", postRoutes);
app.use("/users", userRoutes);
app.use("/dashboard", dashboardRoutes);

// Connect to MongoDB once, then start the server.
mongoose
  .connect(mongoUri)
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to MongoDB", error);
    process.exit(1);
  });
