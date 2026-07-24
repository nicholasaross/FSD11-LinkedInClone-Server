import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CURRICULUM_PATH = path.join(
  __dirname,
  "Codecademy-FSD-Curriculum.json",
);

class FSDCurriculum {
  #curriculum = null;

  constructor(filePath = DEFAULT_CURRICULUM_PATH) {
    this.filePath = filePath;
  }

  load() {
    if (this.#curriculum === null) {
      const raw = readFileSync(this.filePath, "utf-8");
      const parsed = JSON.parse(raw);
      this.#curriculum = parsed.map((entry) => {
        const is_practical = entry.lecture.startsWith("Practical Session: ");

        return {
          ...entry,
          date: new Date(entry.date),
          is_practical,
          lecture: is_practical
            ? entry.lecture.replace("Practical Session: ", "")
            : entry.lecture.split(", "),
        };
      });
    }

    return this.#curriculum;
  }

  getPosts(author, postCount = 1) {
    if (this.#curriculum === null) {
      throw new Error("Curriculum not loaded. Call load() first.");
    }

    const posts = [];

    const practicalPrefixes = [
      "Busy preparing for",
      "I am reading notes on",
      "About to watch recording of",
      "Writing code for",
      "Writing tests for",
      "Reviewing",
      "Just submitted my solution for",
    ];

    const lecturePrefixes = [
      "Busy preparing for",
      "I am reading notes on",
      "About to watch recording of",
      "Revising",
      "Doing exercises for",
      "Found cool online resource for",
      "Writing example code for",
    ];

    for (let i = 0; i < postCount; i++) {
      const randomSession =
        this.#curriculum[Math.floor(Math.random() * this.#curriculum.length)];
      const header = randomSession.header;

      let sentence = "";
      if (randomSession.is_practical) {
        sentence = `${practicalPrefixes[Math.floor(Math.random() * practicalPrefixes.length)]} ${randomSession.lecture} practical`;
      } else {
        sentence = `${lecturePrefixes[Math.floor(Math.random() * lecturePrefixes.length)]} ${randomSession.lecture[Math.floor(Math.random() * randomSession.lecture.length)]}`;
      }

      posts.push({
        author,
        content: `${sentence} — ${header}`,
      });
    }

    return posts;
  }
}

const curriculum = new FSDCurriculum();
curriculum.load();

export default curriculum;
