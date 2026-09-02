export const fail = (res, status, message) =>
  res.status(status).json({
    status: "error",
    timestamp: new Date().toLocaleString(),
    message,
  });

export const failFromError = (res, error, status, message) =>
  error?.name === "ValidationError"
    ? fail(res, 400, error.message)
    : fail(res, status, message);
