import Connection from "../models/connection.model.js";

// how the viewer relates to a user: "pendingOutgoing" is a request the viewer
// sent, "pendingIncoming" one they have been asked to answer
const stateFor = (connection, userId) => ({
  connectionId: connection._id,
  connectionStatus:
    connection.status === "accepted"
      ? "accepted"
      : connection.requester.equals(userId)
        ? "pendingOutgoing"
        : "pendingIncoming",
});

// adds the derived connection fields to a user, or to an array of users,
// as seen by the user doing the asking
export const withConnectionState = async (userOrUsers, userId) => {
  const users = Array.isArray(userOrUsers) ? userOrUsers : [userOrUsers];
  const ids = users.map((user) => user._id);

  // every record tying the viewer to someone in the list, either direction
  const connections = await Connection.find({
    $or: [
      { requester: userId, recipient: { $in: ids } },
      { requester: { $in: ids }, recipient: userId },
    ],
  });

  const byUser = new Map(
    connections.map((connection) => {
      const other = connection.requester.equals(userId)
        ? connection.recipient
        : connection.requester;

      return [other.toString(), stateFor(connection, userId)];
    }),
  );

  // how big each listed user's network is, counted in one pass
  const counts = await Connection.aggregate([
    {
      $match: {
        status: "accepted",
        $or: [{ requester: { $in: ids } }, { recipient: { $in: ids } }],
      },
    },
    { $project: { ends: ["$requester", "$recipient"] } },
    { $unwind: "$ends" },
    { $group: { _id: "$ends", count: { $sum: 1 } } },
  ]);

  const countByUser = new Map(counts.map((c) => [c._id.toString(), c.count]));

  const decorated = users.map((user) => {
    const key = user._id.toString();

    return {
      ...user.toObject(),
      connectionCount: countByUser.get(key) ?? 0,
      // the viewer has no connection with themselves to report
      connectionStatus: user._id.equals(userId) ? "self" : "none",
      connectionId: null,
      ...(user._id.equals(userId) ? {} : byUser.get(key)),
    };
  });

  return Array.isArray(userOrUsers) ? decorated : decorated[0];
};
