import { SKILL_CATEGORIES } from "../models/skill.model.js";

const validateSkill = (req, res, next) => {
  const { name, category } = req.body;

  if (!name || !String(name).trim()) {
    return res.status(400).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: "Name is required",
    });
  }
  if (!SKILL_CATEGORIES.includes(category)) {
    return res.status(400).json({
      status: "error",
      timestamp: new Date().toLocaleString(),
      message: `category must be one of ${SKILL_CATEGORIES.join(", ")}`,
    });
  }
  next();
};

export default validateSkill;
