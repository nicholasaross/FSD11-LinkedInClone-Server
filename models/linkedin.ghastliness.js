import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_POSTS_PATH = path.join(__dirname, "gemini_linkedin_posts.json");
const DEFAULT_COMMENTS_PATH = path.join(
  __dirname,
  "gemini_linkedin_comments.json",
);

// each seed file is an object wrapping one array of plain strings
const POSTS_KEY = "linkedin_posts";
const COMMENTS_KEY = "linkedin_responses";

class LinkedInGhastliness {
  #posts = null;
  #comments = null;

  constructor(
    postsPath = DEFAULT_POSTS_PATH,
    commentsPath = DEFAULT_COMMENTS_PATH,
  ) {
    this.postsPath = postsPath;
    this.commentsPath = commentsPath;

    this.loadPosts();
    this.loadComments();
  }

  #read(filePath, key) {
    const raw = readFileSync(filePath, "utf-8");
    const entries = JSON.parse(raw)[key];

    if (!Array.isArray(entries)) {
      throw new Error(`Expected an array under "${key}" in ${filePath}`);
    }

    return entries;
  }

  loadPosts() {
    if (this.#posts === null) {
      this.#posts = this.#read(this.postsPath, POSTS_KEY);
    }

    return this.#posts;
  }

  loadComments() {
    if (this.#comments === null) {
      this.#comments = this.#read(this.commentsPath, COMMENTS_KEY);
    }

    return this.#comments;
  }

  // draws `count` entries at random, avoiding repeats until the pool runs dry
  #draw(pool, author, count) {
    const remaining = [...pool];
    const drawn = [];

    for (let i = 0; i < count; i++) {
      if (remaining.length === 0) {
        remaining.push(...pool);
      }

      const index = Math.floor(Math.random() * remaining.length);
      const [content] = remaining.splice(index, 1);
      drawn.push({ author, content });
    }

    return drawn;
  }

  getPosts(author, postCount = 1) {
    if (this.#posts === null) {
      throw new Error("Posts not loaded. Call loadPosts() first.");
    }

    return this.#draw(this.#posts, author, postCount);
  }

  // same pool trick, worded as replies to someone else's post
  getComments(author, commentCount = 1) {
    if (this.#comments === null) {
      throw new Error("Comments not loaded. Call loadComments() first.");
    }

    return this.#draw(this.#comments, author, commentCount);
  }
}

export default new LinkedInGhastliness();
