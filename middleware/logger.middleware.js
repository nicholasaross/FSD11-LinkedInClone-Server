const loggerMiddleware = (req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    console.log(`Response sent at: ${new Date().toLocaleString()}; response status: ${res.statusCode}; response time: ${Date.now() - start} ms`);
  });
  next();
};

export default loggerMiddleware;