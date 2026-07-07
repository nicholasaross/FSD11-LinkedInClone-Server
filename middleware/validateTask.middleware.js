const validateTask = (req, res, next) => {
  const { title, description } = req.body;
  if (!title || !description) {
    return res.status(400).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Title and description are required"
    });
  }
  next();
};

export default validateTask;