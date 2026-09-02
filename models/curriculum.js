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

  // picks a random session from the curriculum and phrases it as a sentence
  #randomSentence(practicalPrefixes, lecturePrefixes) {
    const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const session = pick(this.#curriculum);

    const sentence = session.is_practical
      ? `${pick(practicalPrefixes)} ${session.lecture} practical`
      : `${pick(lecturePrefixes)} ${pick(session.lecture)}`;

    return `${sentence} — ${session.header}`;
  }

  getPosts(author, postCount = 1) {
    if (this.#curriculum === null) {
      throw new Error("Curriculum not loaded. Call load() first.");
    }

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

    const posts = [];
    for (let i = 0; i < postCount; i++) {
      posts.push({
        author,
        content: this.#randomSentence(practicalPrefixes, lecturePrefixes),
      });
    }

    return posts;
  }

  // same idea as getPosts, but worded as a reply to someone else's post
  getComments(author, commentCount = 1) {
    if (this.#curriculum === null) {
      throw new Error("Curriculum not loaded. Call load() first.");
    }

    const practicalPrefixes = [
      "Same here on",
      "Good luck with",
      "Let me know how you get on with",
      "Still stuck on",
      "Just finished",
      "Happy to pair up on",
      "The tricky part of",
    ];

    const lecturePrefixes = [
      "Great notes on",
      "Still revising",
      "Any good resources for",
      "This finally clicked for me on",
      "Same, I am rewatching",
      "Bookmarking this for",
      "Really struggled with",
    ];

    const comments = [];
    for (let i = 0; i < commentCount; i++) {
      comments.push({
        author,
        content: this.#randomSentence(practicalPrefixes, lecturePrefixes),
      });
    }

    return comments;
  }
}

const curriculum = new FSDCurriculum();
curriculum.load();

export default curriculum;
