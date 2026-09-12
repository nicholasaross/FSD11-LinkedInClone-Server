import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { SKILL_CATEGORIES, keyFor } from "./skill.model.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SKILLS_PATH = path.join(__dirname, "skills_catalogue.json");

// the seed file is an object wrapping one array, like the posts and comments
// files, but its entries are { name, category } objects rather than strings
const SKILLS_KEY = "skills";

class SkillCatalogue {
  #skills = null;

  constructor(skillsPath = DEFAULT_SKILLS_PATH) {
    this.skillsPath = skillsPath;

    this.loadSkills();
  }

  #read(filePath, key) {
    const raw = readFileSync(filePath, "utf-8");
    const entries = JSON.parse(raw)[key];

    if (!Array.isArray(entries)) {
      throw new Error(`Expected an array under "${key}" in ${filePath}`);
    }

    // checked here rather than left to Mongoose: a typo'd category in the seed
    // file should fail at startup, not halfway through wiping the database
    return entries.map(({ name, category }) => {
      if (!name || !SKILL_CATEGORIES.includes(category)) {
        throw new Error(
          `Invalid skill in ${filePath}: ${JSON.stringify({ name, category })}`,
        );
      }

      // key included so the result drops straight into Skill.insertMany()
      return { name, category, key: keyFor(name) };
    });
  }

  loadSkills() {
    if (this.#skills === null) {
      this.#skills = this.#read(this.skillsPath, SKILLS_KEY);
    }

    return this.#skills;
  }

  getSkills() {
    if (this.#skills === null) {
      throw new Error("Skills not loaded. Call loadSkills() first.");
    }

    return this.#skills;
  }
}

export default new SkillCatalogue();
