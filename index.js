import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { fail, failFromError } from "./utils/response.utils.js";
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

const mongoUri = `mongodb+srv://nicholasross_db_user:${process.env.DB_PASSWORD}@cluster0.ed0xajm.mongodb.net/linkedinclone-server?retryWrites=true&w=majority&appName=linkedinclone-server`;

const app = express();
app.disable("x-powered-by");

// CORS must come before everything else
app.use(cors({ origin: process.env.CORS_ORIGIN || true, credentials: true }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// serve Swagger UI at /api-docs BEFORE the routes to ensure it is accessible without authentication
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use(loggerMiddleware);
app.use("/", adminRoutes);
app.use("/posts", postRoutes);
app.use("/users", userRoutes);
app.use("/dashboard", dashboardRoutes);

app.use((req, res) =>
  fail(res, 404, `Cannot ${req.method} ${req.originalUrl}`),
);

app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  if (res.headersSent) {
    return next(error);
  }
  failFromError(res, error, 500, "Internal server error");
});

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
