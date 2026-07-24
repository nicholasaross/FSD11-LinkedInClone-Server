const validatePost = (req, res, next) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Content is required",
    });
  }
  next();
};

export default validatePost;
