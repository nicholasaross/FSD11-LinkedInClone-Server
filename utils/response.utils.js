export const fail = (res, status, message) =>
  res.status(status).json({
    status: "error",
    timestamp: new Date().toLocaleString(),
    message,
  });
