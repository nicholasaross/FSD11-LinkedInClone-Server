import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { randomUUID } from "node:crypto";

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

  getTasks(userId, taskCount = 1) {
    if (this.#curriculum === null) {
      throw new Error("Curriculum not loaded. Call load() first.");
    }

    const tasks = [];

    const practicalPrefixes = [
      "Prepare for",
      "Read notes on",
      "Watch recording of",
      "Write code for",
      "Write tests for",
      "Review",
      "Submit",
    ];

    const lecturePrefixes = [
      "Prepare for",
      "Read notes on",
      "Watch recording of",
      "Revise",
      "Do exercises for",
      "Find online resources for",
      "Write example code for",
    ];

    for (let i = 0; i < taskCount; i++) {
      const id = randomUUID();

      const randomSession =
        this.#curriculum[Math.floor(Math.random() * this.#curriculum.length)];
      const description = randomSession.header;

      let title = "";
      if (randomSession.is_practical) {
        title = `${practicalPrefixes[Math.floor(Math.random() * practicalPrefixes.length)]} ${randomSession.lecture} practical`;
      } else {
        title = `${lecturePrefixes[Math.floor(Math.random() * lecturePrefixes.length)]} ${randomSession.lecture[Math.floor(Math.random() * randomSession.lecture.length)]}`;
      }

      const currentDate = Date.now();
      const completed = currentDate > randomSession.date;

      tasks.push({
        id,
        userId,
        title,
        description,
        completed,
      });
    }

    return tasks;
  }
}

const curriculum = new FSDCurriculum();
curriculum.load();

export default curriculum;
