import { Router } from "express";
import {
  getConnections,
  requestConnection,
  acceptConnection,
  rejectConnection,
  removeConnection,
} from "../controllers/connection.controller.js";
import validateConnection from "../middleware/validateConnection.middleware.js";
import authenticate from "../middleware/auth.middleware.js";

import mongoose from "mongoose";
import { fail } from "../utils/response.utils.js";

const router = Router();
router.use(authenticate); //	apply to all routes in this router

// stops a malformed id reaching the controller, where it would throw a CastError
router.param("id", (req, res, next, id) =>
  mongoose.Types.ObjectId.isValid(id)
    ? next()
    : fail(res, 404, "Connection not found"),
);

// GET /connections - Get your connections and pending requests
router.get("/", (req, res) => getConnections(req, res));

// POST /connections - Request a connection with another user
router.post("/", validateConnection, (req, res) => requestConnection(req, res));

// POST /connections/:id/accept - Accept a request sent to you
router.post("/:id/accept", (req, res) => acceptConnection(req, res));

// POST /connections/:id/reject - Reject a request sent to you
router.post("/:id/reject", (req, res) => rejectConnection(req, res));

// DELETE /connections/:id - Withdraw a request you sent, or disconnect
router.delete("/:id", (req, res) => removeConnection(req, res));

export default router;
