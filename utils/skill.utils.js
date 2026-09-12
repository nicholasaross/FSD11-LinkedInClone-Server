import User from "../models/user.model.js";

// adds the derived skill fields to a skill, or to an array of skills, as seen by
// the user doing the asking: how many people hold it, and whether they do
export const withSkillState = async (skillOrSkills, viewer) => {
  const skills = Array.isArray(skillOrSkills) ? skillOrSkills : [skillOrSkills];
  const ids = skills.map((skill) => skill._id);

  // how many portfolios each listed skill appears in, counted in one pass
  const counts = await User.aggregate([
    { $match: { skills: { $in: ids } } },
    { $unwind: "$skills" },
    { $match: { skills: { $in: ids } } },
    { $group: { _id: "$skills", count: { $sum: 1 } } },
  ]);

  const countBySkill = new Map(counts.map((c) => [c._id.toString(), c.count]));

  // the viewer's own portfolio, as a set of strings to compare against. the
  // entries are bare ids on a freshly loaded user and documents on a populated
  // one, so reach for _id when it is there
  const mine = new Set(
    (viewer.skills ?? []).map((skill) => (skill?._id ?? skill).toString()),
  );

  const decorated = skills.map((skill) => {
    const key = skill._id.toString();

    return {
      ...skill.toObject(),
      userCount: countBySkill.get(key) ?? 0,
      inPortfolio: mine.has(key),
    };
  });

  return Array.isArray(skillOrSkills) ? decorated : decorated[0];
};
