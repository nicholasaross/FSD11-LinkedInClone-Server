import mongoose from "mongoose";

const validateConnection = (req, res, next) => {
  const { recipient } = req.body;
  if (!recipient) {
    return res.status(400).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Recipient is required",
    });
  }
  if (!mongoose.Types.ObjectId.isValid(recipient)) {
    return res.status(400).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "recipient must be a valid user id",
    });
  }
  next();
};

export default validateConnection;
