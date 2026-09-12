import Skill, { SKILL_CATEGORIES, keyFor } from "../models/skill.model.js";
import User from "../models/user.model.js";
import { fail, failFromError } from "../utils/response.utils.js";
import { withSkillState } from "../utils/skill.utils.js";
import { withConnectionState } from "../utils/connection.utils.js";

const succeed = (res, data, status = 200) =>
  res.status(status).json({
    status: "success",
    timestamp: new Date().toLocaleString(),
    data,
  });

// catalogue order: the three categories, then alphabetical within each
const BY_CATEGORY_THEN_NAME = { category: 1, name: 1 };

// a user's search term goes into a regex, so anything meaningful to the regex
// engine has to be neutered first
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// a skill belongs to whoever created it; the seeded catalogue has no creator, so
// only an admin can rename or delete those
const mayEdit = (skill, user) =>
  user.isAdmin || Boolean(skill.createdBy?.equals(user._id));

const getSkills = async (req, res) => {
  // #swagger.summary = 'List the skill catalogue, decorated with how many users hold each skill'
  // #swagger.description = 'Every skill on the server, both the seeded catalogue and any a user has added. Narrow it with ?category=technical|business|extreme and ?q=<search>, which matches anywhere in the name. Each skill carries userCount and inPortfolio (whether you hold it).'
  // #swagger.responses[200] = { description: 'List of skills' }
  // #swagger.responses[400] = { description: 'Invalid category' }
  // #swagger.responses[401] = { description: 'Invalid or missing token' }
  try {
    const { category, q } = req.query;

    if (category !== undefined && !SKILL_CATEGORIES.includes(category)) {
      return fail(
        res,
        400,
        `category must be one of ${SKILL_CATEGORIES.join(", ")}`,
      );
    }

    const filter = {};
    if (category) filter.category = category;
    // matched against the lowercased key so the search is case-insensitive
    // without a $regex option the index can't help with anyway
    if (q) filter.key = { $regex: escapeRegex(q.toLowerCase()) };

    const skills = await Skill.find(filter).sort(BY_CATEGORY_THEN_NAME);

    succeed(res, await withSkillState(skills, req.user));
  } catch (error) {
    console.error("Error fetching skills:", error);
    failFromError(res, error, 500, "Failed to fetch skills");
  }
};

const getSkill = async (req, res) => {
  // #swagger.summary = 'Get a single skill by ID'
  // #swagger.responses[200] = { description: 'The skill' }
  // #swagger.responses[404] = { description: 'Skill not found' }
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill) {
      return fail(res, 404, "Skill not found");
    }

    succeed(res, await withSkillState(skill, req.user));
  } catch (error) {
    console.error("Error fetching skill:", error);
    failFromError(res, error, 404, "Skill not found");
  }
};

const createSkill = async (req, res) => {
  // #swagger.summary = 'Add a new skill to the shared catalogue'
  // #swagger.description = 'Any authenticated user may add a skill. It joins the catalogue for everyone, and only its creator (or an admin) can rename or delete it afterwards. Creating a skill does not add it to your own portfolio: POST /users/{id}/skills does that.'
  /* #swagger.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["name", "category"],
              properties: {
                name: { type: "string", example: "Underwater Basket Weaving" },
                category: { type: "string", enum: ["technical", "business", "extreme"], example: "extreme" }
              }
            }
          }
        }
      } */
  // #swagger.responses[201] = { description: 'Skill created' }
  // #swagger.responses[400] = { description: 'Name missing, or category not one of the three' }
  // #swagger.responses[409] = { description: 'A skill with that name already exists' }
  try {
    const { name, category } = req.body;

    const skill = await Skill.create({
      name: name.trim(),
      key: keyFor(name),
      category,
      createdBy: req.user._id,
    });

    succeed(res, await withSkillState(skill, req.user), 201);
  } catch (error) {
    console.error("Error creating skill:", error);
    // 11000 is Mongo's duplicate-key code; here it's the unique key, i.e. the
    // same name in different clothes ("react", "React", "  REACT  ")
    if (error.code === 11000) {
      return fail(res, 409, "A skill with that name already exists");
    }
    failFromError(res, error, 500, "Failed to create skill");
  }
};

const updateSkill = async (req, res) => {
  // #swagger.summary = 'Rename or recategorise a skill (creator or admin only)'
  // #swagger.description = 'Other users may already hold this skill, so editing is limited to whoever added it. Seeded catalogue skills have no creator and can only be edited by an admin.'
  /* #swagger.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                name: { type: "string", example: "Underwater Basket Weaving" },
                category: { type: "string", enum: ["technical", "business", "extreme"], example: "extreme" }
              }
            }
          }
        }
      } */
  // #swagger.responses[200] = { description: 'Skill updated' }
  // #swagger.responses[403] = { description: 'Not your skill' }
  // #swagger.responses[404] = { description: 'Skill not found' }
  // #swagger.responses[409] = { description: 'Another skill already has that name' }
  try {
    const existing = await Skill.findById(req.params.id);
    if (!existing) {
      return fail(res, 404, "Skill not found");
    }
    if (!mayEdit(existing, req.user)) {
      return fail(res, 403, "You did not add this skill");
    }

    const { name, category } = req.body;

    // partial update: only touch what the body mentions
    const set = {};
    if (name !== undefined) {
      set.name = String(name).trim();
      // the uniqueness key is derived, so a rename has to carry it along
      set.key = keyFor(name);
    }
    if (category !== undefined) set.category = category;

    const skill = await Skill.findByIdAndUpdate(
      req.params.id,
      { $set: set },
      { returnDocument: "after", runValidators: true },
    );

    succeed(res, await withSkillState(skill, req.user));
  } catch (error) {
    console.error("Error updating skill:", error);
    if (error.code === 11000) {
      return fail(res, 409, "A skill with that name already exists");
    }
    failFromError(res, error, 500, "Failed to update skill");
  }
};

const deleteSkill = async (req, res) => {
  // #swagger.summary = 'Delete a skill from the catalogue (creator or admin only)'
  // #swagger.description = 'Also removes the skill from every portfolio holding it, since there are no foreign keys to do it for us. Returns how many users were affected.'
  // #swagger.responses[200] = { description: 'Skill deleted' }
  // #swagger.responses[403] = { description: 'Not your skill' }
  // #swagger.responses[404] = { description: 'Skill not found' }
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill) {
      return fail(res, 404, "Skill not found");
    }
    if (!mayEdit(skill, req.user)) {
      return fail(res, 403, "You did not add this skill");
    }

    await skill.deleteOne();

    // no foreign keys in Mongo: every portfolio holding it would keep an id that
    // populates to null
    const { modifiedCount } = await User.updateMany(
      { skills: skill._id },
      { $pull: { skills: skill._id } },
    );

    succeed(res, {
      message: "Skill deleted successfully",
      removed: { portfolios: modifiedCount },
    });
  } catch (error) {
    console.error("Error deleting skill:", error);
    failFromError(res, error, 500, "Failed to delete skill");
  }
};

const getSkillUsers = async (req, res) => {
  // #swagger.summary = 'List the users who hold a skill'
  // #swagger.description = 'Person cards decorated with your connection state, the same shape GET /users returns.'
  // #swagger.responses[200] = { description: 'List of users' }
  // #swagger.responses[404] = { description: 'Skill not found' }
  try {
    const { id } = req.params;

    if (!(await Skill.exists({ _id: id }))) {
      return fail(res, 404, "Skill not found");
    }

    const users = await User.find({ skills: id })
      .sort({ name: 1 })
      .populate("skills");

    succeed(res, await withConnectionState(users, req.user));
  } catch (error) {
    console.error("Error fetching users for skill:", error);
    failFromError(res, error, 500, "Failed to fetch users");
  }
};

// the three below are mounted on the user router, so they inherit its id guard

// authenticate loaded req.user before the portfolio was written, so its skills
// array is a beat behind. when the viewer is the user who just changed, decorate
// against the updated document instead, or inPortfolio reports the old answer
const viewerFor = (user, requester) =>
  user._id.equals(requester._id) ? user : requester;

const getUserSkills = async (req, res) => {
  // #swagger.summary = "Get a user's skill portfolio"
  // #swagger.description = 'Readable by any authenticated user, like the profile itself.'
  // #swagger.responses[200] = { description: 'List of skills' }
  // #swagger.responses[404] = { description: 'User not found' }
  try {
    const user = await User.findById(req.params.id).populate({
      path: "skills",
      options: { sort: BY_CATEGORY_THEN_NAME },
    });
    if (!user) {
      return fail(res, 404, "User not found");
    }

    succeed(res, await withSkillState(user.skills, req.user));
  } catch (error) {
    console.error("Error fetching user skills:", error);
    failFromError(res, error, 500, "Failed to fetch skills");
  }
};

const addUserSkill = async (req, res) => {
  // #swagger.summary = 'Add a skill to a portfolio (your own, or anyone if you are an admin)'
  // #swagger.description = 'Send { skill } with the id of a catalogue skill, or { name, category } to add a brand new skill to the catalogue and the portfolio in one call. Adding a skill twice is a no-op rather than an error. Returns the full portfolio.'
  /* #swagger.requestBody = {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                skill: { type: "string", example: "6aa42b6454c881523762f1ea", description: "Id of an existing catalogue skill." },
                name: { type: "string", example: "Underwater Basket Weaving", description: "Use with category instead of skill, to create and add in one call." },
                category: { type: "string", enum: ["technical", "business", "extreme"], example: "extreme" }
              }
            }
          }
        }
      } */
  // #swagger.responses[200] = { description: 'Skill added; returns the portfolio' }
  // #swagger.responses[400] = { description: 'Neither a valid skill id nor a name and category' }
  // #swagger.responses[403] = { description: 'Not your account' }
  // #swagger.responses[404] = { description: 'User or skill not found' }
  try {
    const { skill: skillId, name, category } = req.body;

    let skill;
    if (skillId) {
      skill = await Skill.findById(skillId);
      if (!skill) {
        return fail(res, 404, "Skill not found");
      }
    } else if (name && SKILL_CATEGORIES.includes(category)) {
      // create-and-add: if someone already added this name, use theirs rather
      // than failing on the unique key
      const key = keyFor(name);
      skill =
        (await Skill.findOne({ key })) ??
        (await Skill.create({
          name: String(name).trim(),
          key,
          category,
          createdBy: req.user._id,
        }));
    } else {
      return fail(
        res,
        400,
        `Send a skill id, or a name and a category (${SKILL_CATEGORIES.join(", ")})`,
      );
    }

    // $addToSet, so adding a skill you already hold changes nothing
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { skills: skill._id } },
      { returnDocument: "after" },
    ).populate({ path: "skills", options: { sort: BY_CATEGORY_THEN_NAME } });

    if (!user) {
      return fail(res, 404, "User not found");
    }

    succeed(res, await withSkillState(user.skills, viewerFor(user, req.user)));
  } catch (error) {
    console.error("Error adding skill to portfolio:", error);
    if (error.code === 11000) {
      return fail(res, 409, "A skill with that name already exists");
    }
    failFromError(res, error, 500, "Failed to add skill");
  }
};

const removeUserSkill = async (req, res) => {
  // #swagger.summary = 'Remove a skill from a portfolio (your own, or anyone if you are an admin)'
  // #swagger.description = 'Only the portfolio entry goes; the skill stays in the shared catalogue. Removing a skill the user does not hold is a no-op rather than an error. Returns the full portfolio.'
  // #swagger.responses[200] = { description: 'Skill removed; returns the portfolio' }
  // #swagger.responses[403] = { description: 'Not your account' }
  // #swagger.responses[404] = { description: 'User not found' }
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $pull: { skills: req.params.skillId } },
      { returnDocument: "after" },
    ).populate({ path: "skills", options: { sort: BY_CATEGORY_THEN_NAME } });

    if (!user) {
      return fail(res, 404, "User not found");
    }

    succeed(res, await withSkillState(user.skills, viewerFor(user, req.user)));
  } catch (error) {
    console.error("Error removing skill from portfolio:", error);
    failFromError(res, error, 500, "Failed to remove skill");
  }
};

export {
  getSkills,
  getSkill,
  createSkill,
  updateSkill,
  deleteSkill,
  getSkillUsers,
  getUserSkills,
  addUserSkill,
  removeUserSkill,
};
