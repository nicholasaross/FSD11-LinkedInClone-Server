import { isMonth } from "../models/user.model.js";

// a create has to carry the whole role; an update only has to answer for the
// fields it actually sends
const REQUIRED = ["title", "company", "start"];

// the same 400 envelope the other validators write out, said once because there
// are five ways to get this body wrong
const reject = (res, message) =>
  res.status(400).json({
    status: "error",
    timestamp: new Date().toLocaleString(),
    message,
  });

const validateRole = (req, res, next) => {
  const { start, end } = req.body;

  if (req.method === "POST") {
    const missing = REQUIRED.find(
      (field) => !String(req.body[field] ?? "").trim(),
    );
    if (missing) {
      return reject(res, `${missing} is required`);
    }
  }

  if (start !== undefined && !isMonth(start)) {
    return reject(res, "start must be a month in YYYY-MM form, e.g. 2019-03");
  }
  // null and "" are answers here rather than omissions: both are how a role says
  // it has not ended, the empty string because that is what a cleared form sends
  if (end !== undefined && end !== null && end !== "" && !isMonth(end)) {
    return reject(
      res,
      "end must be a month in YYYY-MM form, or null for a current role",
    );
  }
  // both ends in the one body can be settled here. a PUT that moves only one of
  // them is left to the schema, which can see the half the body did not send
  if (isMonth(start) && isMonth(end) && end < start) {
    return reject(res, "end must not come before start");
  }

  next();
};

export default validateRole;
