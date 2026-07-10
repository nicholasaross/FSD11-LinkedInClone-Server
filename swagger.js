// swagger.js
import swaggerAutogen from "swagger-autogen";

const doc = {
  info: {
    title: "Multi-User Task Manager API",
    version: "1.0.0",
    description:
      "Endpoints require a Bearer token. Admin-only endpoints return 403 for non-admin tokens.",
  },
  servers: [{ url: "http://localhost:3322" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT", // remove if your token is opaque
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

const outputFile = "./swagger-output.json";
const routes = ["./routes/task.routes.js", "./routes/admin.routes.js"];

// Note the two-step call: configure the generator, then invoke it.
swaggerAutogen({ openapi: "3.0.0" })(outputFile, routes, doc);
