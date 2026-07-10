import "dotenv/config";
import express from "express";
import adminRoutes from "./routes/admin.routes.js";
import taskRoutes from "./routes/task.routes.js";
import loggerMiddleware from "./middleware/logger.middleware.js";
import { createRequire } from "module";
import swaggerUi from "swagger-ui-express";

const require = createRequire(import.meta.url);
const swaggerFile = require("./swagger-output.json");

const port = process.env.PORT || 3000;
const app = express();
app.disable("x-powered-by");
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Serve Swagger UI at /api-docs BEFORE the routes to ensure it is accessible without authentication
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));
app.use(loggerMiddleware);
app.use("/", adminRoutes);
app.use("/", taskRoutes);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
