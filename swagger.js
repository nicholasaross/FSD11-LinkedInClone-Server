// swagger.js
import swaggerAutogen from "swagger-autogen";

const doc = {
  info: {
    title: "Social Media App API v2",
    version: "2.0.0",
    description:
      "Most endpoints require a Bearer JWT (obtained from POST /users/login). Admin-only endpoints return 403 for non-admin tokens.",
  },
  servers: [{ url: "http://localhost:3322" }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  security: [{ bearerAuth: [] }],
};

const outputFile = "./swagger-output.json";
// Point at the root file so swagger-autogen follows each app.use(prefix, router)
// mount and prepends the correct prefix (/posts, /users, /dashboard) to the
// bare paths defined inside the individual route files.
const routes = ["./index.js"];

// Note the two-step call: configure the generator, then invoke it.
swaggerAutogen({ openapi: "3.0.0" })(outputFile, routes, doc);
