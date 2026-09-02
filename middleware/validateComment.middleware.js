const validateComment = (req, res, next) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Comment content is required",
    });
  }
  next();
};

export default validateComment;
