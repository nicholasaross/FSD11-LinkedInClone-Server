import Connection from "../models/connection.model.js";
import User from "../models/user.model.js";
import { fail, failFromError } from "../utils/response.utils.js";

// wider than post.controller.js's authorFields: a person card needs the avatar and handle
const userFields = "name username email biography imageUrl skills";

const STATUSES = ["pending", "accepted"];
const DIRECTIONS = ["incoming", "outgoing"];

// both ends populated, so a client can render either side of the pair; the array
// form works on a query and on an already-created document alike. the portfolios
// come too, so a profile page can list what everyone in a network can do without
// asking after each of them one at a time
const bothEnds = [
  { path: "requester", select: userFields, populate: { path: "skills" } },
  { path: "recipient", select: userFields, populate: { path: "skills" } },
];

const getConnections = async (req, res) => {
  // #swagger.summary = "Get the authenticated user's connections and pending requests (newest first)"
  // #swagger.description = 'Returns every connection the authenticated user is part of, both ends populated. Narrow it with ?status=pending|accepted and ?direction=incoming|outgoing, where incoming means requests sent to you and outgoing means requests you sent.'
  // #swagger.responses[200] = { description: 'List of connections' }
  // #swagger.responses[400] = { description: 'Invalid status or direction' }
  // #swagger.responses[401] = { description: 'Invalid or missing token' }
  try {
    const { status, direction } = req.query;

    if (status !== undefined && !STATUSES.includes(status)) {
      return fail(res, 400, "status must be pending or accepted");
    }
    if (direction !== undefined && !DIRECTIONS.includes(direction)) {
      return fail(res, 400, "direction must be incoming or outgoing");
    }

    // you only ever see your own connections; direction narrows to one end of them
    const filter = {};
    if (direction === "incoming") filter.recipient = req.user._id;
    else if (direction === "outgoing") filter.requester = req.user._id;
    else
      filter.$or = [{ requester: req.user._id }, { recipient: req.user._id }];

    if (status) filter.status = status;

    const connections = await Connection.find(filter)
      .sort({ createdAt: -1 })
      .populate(bothEnds);

    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: connections,
    });
  } catch (error) {
    console.error("Error fetching connections:", error);
    failFromError(res, error, 500, "Failed to fetch connections");
  }
};

const getConnectionsForUser = async (req, res) => {
  // #swagger.summary = "Get another user's accepted connections (newest first)"
  // #swagger.description = 'Accepted connections only, both ends populated: a pending request is between those two people and nobody else. You may only read this for yourself, or for someone you are already connected with; admins may read anyone.'
  // #swagger.responses[200] = { description: 'List of accepted connections' }
  // #swagger.responses[401] = { description: 'Invalid or missing token' }
  // #swagger.responses[403] = { description: 'Not connected with this user' }
  // #swagger.responses[404] = { description: 'User not found' }
  try {
    const { id } = req.params;

    if (!(await User.exists({ _id: id }))) {
      return fail(res, 404, "User not found");
    }

    // the network is only on show to the people in it: yourself, anyone you
    // have accepted, and admins. this mirrors what the client will display, so
    // the URL itself is no way round it
    const mayView =
      req.user._id.equals(id) ||
      req.user.isAdmin ||
      (await Connection.exists({
        status: "accepted",
        $or: [
          { requester: req.user._id, recipient: id },
          { requester: id, recipient: req.user._id },
        ],
      }));

    if (!mayView) {
      return fail(res, 403, "You are not connected with this user");
    }

    const connections = await Connection.find({
      status: "accepted",
      $or: [{ requester: id }, { recipient: id }],
    })
      .sort({ createdAt: -1 })
      .populate(bothEnds);

    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: connections,
    });
  } catch (error) {
    console.error("Error fetching connections for user:", error);
    failFromError(res, error, 500, "Failed to fetch connections");
  }
};

const requestConnection = async (req, res) => {
  // #swagger.summary = 'Request a connection with another user'
  /* #swagger.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["recipient"],
              properties: {
                recipient: { type: "string", example: "6aa42b6454c881523762f1ea", description: "Id of the user you want to connect with." }
              }
            }
          }
        }
      } */
  // #swagger.responses[201] = { description: 'Connection request created' }
  // #swagger.responses[400] = { description: 'Recipient missing, not a valid id, or the requester themselves' }
  // #swagger.responses[404] = { description: 'Recipient not found' }
  // #swagger.responses[409] = { description: 'Already connected, or a request is already pending' }
  try {
    const { recipient } = req.body;

    if (req.user._id.equals(recipient)) {
      return fail(res, 400, "You cannot connect with yourself");
    }

    if (!(await User.exists({ _id: recipient }))) {
      return fail(res, 404, "User not found");
    }

    // a pair may only have one record, whichever way round it was created
    const existing = await Connection.findOne({
      $or: [
        { requester: req.user._id, recipient },
        { requester: recipient, recipient: req.user._id },
      ],
    });

    if (existing) {
      return fail(
        res,
        409,
        existing.status === "accepted"
          ? "You are already connected with this user"
          : "A connection request is already pending with this user",
      );
    }

    const connection = await Connection.create({
      requester: req.user._id,
      recipient,
    });

    res.status(201).json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: await connection.populate(bothEnds),
    });
  } catch (error) {
    console.error("Error requesting connection:", error);
    // 11000 is Mongo's duplicate-key code; here it's the unique requester/recipient
    // pair, i.e. the same request arriving twice at once
    if (error.code === 11000) {
      return fail(res, 409, "A connection already exists with this user");
    }
    failFromError(res, error, 500, "Failed to request connection");
  }
};

const acceptConnection = async (req, res) => {
  // #swagger.summary = 'Accept a pending connection request (recipient only)'
  // #swagger.responses[200] = { description: 'Request accepted; returns the updated connection' }
  // #swagger.responses[401] = { description: 'Invalid or missing token' }
  // #swagger.responses[404] = { description: 'No pending request with that id addressed to you' }
  try {
    // only the recipient of a still-pending request can accept it
    const connection = await Connection.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id, status: "pending" },
      { $set: { status: "accepted" } },
      { returnDocument: "after" },
    ).populate(bothEnds);

    if (!connection) {
      return fail(res, 404, "Connection request not found");
    }

    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: connection,
    });
  } catch (error) {
    console.error("Error accepting connection:", error);
    failFromError(res, error, 500, "Failed to accept connection");
  }
};

const rejectConnection = async (req, res) => {
  // #swagger.summary = 'Reject a pending connection request (recipient only)'
  // #swagger.description = 'Deletes the request rather than marking it rejected, so the other user is free to ask again later.'
  // #swagger.responses[200] = { description: 'Request rejected' }
  // #swagger.responses[401] = { description: 'Invalid or missing token' }
  // #swagger.responses[404] = { description: 'No pending request with that id addressed to you' }
  try {
    // same guard as accepting: recipient, and still pending
    const connection = await Connection.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id,
      status: "pending",
    });

    if (!connection) {
      return fail(res, 404, "Connection request not found");
    }

    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      message: "Connection request rejected",
    });
  } catch (error) {
    console.error("Error rejecting connection:", error);
    failFromError(res, error, 500, "Failed to reject connection");
  }
};

const removeConnection = async (req, res) => {
  // #swagger.summary = 'Withdraw a request you sent, or disconnect from a user'
  // #swagger.description = 'Works on a pending request or an accepted connection, and either party may do it.'
  // #swagger.responses[200] = { description: 'Connection removed' }
  // #swagger.responses[401] = { description: 'Invalid or missing token' }
  // #swagger.responses[404] = { description: 'Connection not found, or you are not part of it' }
  try {
    // unlike accept/reject, either end of the pair may do this
    const connection = await Connection.findOneAndDelete({
      _id: req.params.id,
      $or: [{ requester: req.user._id }, { recipient: req.user._id }],
    });

    if (!connection) {
      return fail(res, 404, "Connection not found");
    }

    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      message: "Connection removed successfully",
    });
  } catch (error) {
    console.error("Error removing connection:", error);
    failFromError(res, error, 500, "Failed to remove connection");
  }
};

export {
  getConnections,
  getConnectionsForUser,
  requestConnection,
  acceptConnection,
  rejectConnection,
  removeConnection,
};
