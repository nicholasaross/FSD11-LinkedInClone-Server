import User from "../models/user.model.js";
import { fail, failFromError } from "../utils/response.utils.js";

const succeed = (res, data, status = 200) =>
  res.status(status).json({
    status: "success",
    timestamp: new Date().toLocaleString(),
    data,
  });

// an absent end means the role is current, whatever shape the absence takes
const isCurrent = (role) => !role.end;

// current roles first, then the most recently begun: a seat somebody still holds
// outranks one that ended last month, however long ago it started. the "YYYY-MM"
// strings compare in calendar order, which is half of why they are strings
const byMostRecent = (a, b) =>
  isCurrent(a) === isCurrent(b)
    ? b.start.localeCompare(a.start)
    : isCurrent(a)
      ? -1
      : 1;

// sorted on the way in rather than on the way out, so the roles riding along
// inside a user document - GET /users, /users/me, a person card - arrive in
// display order without every caller having to know about roles. mongoose reads
// a sort as a $set of the whole array, so the new order survives the save
const sortRoles = (user) => user.roles.sort(byMostRecent);

// the four below are mounted on the user router, so they inherit its id guard

const getUserRoles = async (req, res) => {
  // #swagger.summary = "Get a user's work history"
  // #swagger.description = 'Readable by any authenticated user, like the profile itself. Current roles come first, then the most recently begun. A role whose end is null is one the user still holds.'
  // #swagger.responses[200] = { description: 'List of roles' }
  // #swagger.responses[401] = { description: 'Invalid or missing token' }
  // #swagger.responses[404] = { description: 'User not found' }
  try {
    // nothing else on the profile is wanted here
    const user = await User.findById(req.params.id).select("roles");
    if (!user) {
      return fail(res, 404, "User not found");
    }

    succeed(res, user.roles);
  } catch (error) {
    console.error("Error fetching user roles:", error);
    failFromError(res, error, 500, "Failed to fetch roles");
  }
};

const addUserRole = async (req, res) => {
  // #swagger.summary = 'Add a role to a work history (your own, or anyone if you are an admin)'
  // #swagger.description = 'Months are "YYYY-MM". Leave end out, or send it as null, for a role the user still holds. Returns the whole history, in display order.'
  /* #swagger.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["title", "company", "start"],
              properties: {
                title: { type: "string", example: "Board Member" },
                company: { type: "string", example: "Microsoft" },
                companyLogoUrl: { type: "string", example: "assets/ms-logo.png", description: "Served by the client from its own public folder." },
                start: { type: "string", example: "2019-03" },
                end: { type: "string", nullable: true, example: null, description: "null or an empty string for a role the user still holds." }
              }
            }
          }
        }
      } */
  // #swagger.responses[201] = { description: 'Role added; returns the history' }
  // #swagger.responses[400] = { description: 'Missing fields, a month that is not YYYY-MM, or an end before the start' }
  // #swagger.responses[403] = { description: 'Not your account' }
  // #swagger.responses[404] = { description: 'User not found' }
  try {
    const { title, company, companyLogoUrl, start, end } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return fail(res, 404, "User not found");
    }

    user.roles.push({
      title: String(title).trim(),
      company: String(company).trim(),
      // || undefined so an empty string means "no logo" rather than storing ""
      companyLogoUrl: companyLogoUrl || undefined,
      start,
      end: end || null,
    });
    sortRoles(user);

    // a document save rather than findByIdAndUpdate: the rule that end may not
    // precede start has to see both halves of the role, and only full document
    // validation shows it the subdocument rather than a bag of update operators
    await user.save();

    succeed(res, user.roles, 201);
  } catch (error) {
    console.error("Error adding role:", error);
    failFromError(res, error, 500, "Failed to add role");
  }
};

const updateUserRole = async (req, res) => {
  // #swagger.summary = 'Update a role (your own, or anyone if you are an admin)'
  // #swagger.description = 'A partial update: only the fields the body mentions are touched. Send end as null to reopen a role the user has gone back to, or as a month to close a current one. Returns the whole history, in display order.'
  /* #swagger.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                title: { type: "string", example: "Chairman" },
                company: { type: "string", example: "Microsoft" },
                companyLogoUrl: { type: "string", example: "assets/ms-logo.png", description: "Send an empty string to remove the logo." },
                start: { type: "string", example: "2019-03" },
                end: { type: "string", nullable: true, example: "2024-11", description: "null or an empty string for a role the user still holds." }
              }
            }
          }
        }
      } */
  // #swagger.responses[200] = { description: 'Role updated; returns the history' }
  // #swagger.responses[400] = { description: 'A month that is not YYYY-MM, or an end before the start' }
  // #swagger.responses[403] = { description: 'Not your account' }
  // #swagger.responses[404] = { description: 'User or role not found' }
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return fail(res, 404, "User not found");
    }

    const role = user.roles.id(req.params.roleId);
    if (!role) {
      return fail(res, 404, "Role not found");
    }

    const { title, company, companyLogoUrl, start, end } = req.body;

    // partial update: only touch what the body mentions. end is the exception
    // that proves the rule, since a null there is an answer and not a silence
    if (title !== undefined) role.title = String(title).trim();
    if (company !== undefined) role.company = String(company).trim();
    if (companyLogoUrl !== undefined) {
      role.companyLogoUrl = companyLogoUrl || undefined;
    }
    if (start !== undefined) role.start = start;
    if (end !== undefined) role.end = end || null;

    sortRoles(user);
    await user.save();

    succeed(res, user.roles);
  } catch (error) {
    console.error("Error updating role:", error);
    failFromError(res, error, 500, "Failed to update role");
  }
};

const removeUserRole = async (req, res) => {
  // #swagger.summary = 'Remove a role from a work history (your own, or anyone if you are an admin)'
  // #swagger.description = 'Unlike a skill, a role exists only inside the user who held it, so removing one that is not there is a 404 rather than a no-op. Returns what is left of the history.'
  // #swagger.responses[200] = { description: 'Role removed; returns the history' }
  // #swagger.responses[403] = { description: 'Not your account' }
  // #swagger.responses[404] = { description: 'User or role not found' }
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return fail(res, 404, "User not found");
    }

    const role = user.roles.id(req.params.roleId);
    if (!role) {
      return fail(res, 404, "Role not found");
    }

    role.deleteOne();
    await user.save();

    succeed(res, user.roles);
  } catch (error) {
    console.error("Error removing role:", error);
    failFromError(res, error, 500, "Failed to remove role");
  }
};

export { getUserRoles, addUserRole, updateUserRole, removeUserRole };
