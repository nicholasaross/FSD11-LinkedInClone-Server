import { readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_IMAGE_DIR = path.join(__dirname, "microsoft");

// where the front-end serves the same files from
const ASSET_PREFIX = "assets/microsoft";
const EMAIL_DOMAIN = "microsoft.com";
const BIOGRAPHY = "Member of the Board at Microsoft";
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png"];

// "Sandra E. Peterson" -> "sandrap": forename plus the surname's initial, with
// any middle names or initials in between ignored
const usernameFor = (name) => {
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = (part) => part.replace(/[^a-z]/gi, "").toLowerCase();

  const forename = letters(parts[0] ?? "");
  const surname = letters(parts.at(-1) ?? "");

  return `${forename}${surname.charAt(0)}`;
};

class MicrosoftPeople {
  #people = null;

  constructor(imageDir = DEFAULT_IMAGE_DIR) {
    this.imageDir = imageDir;

    this.loadPeople();
  }

  #read(dir) {
    // sorted so a restore always produces the same cast in the same order
    const files = readdirSync(dir)
      .filter((file) =>
        IMAGE_EXTENSIONS.includes(path.extname(file).toLowerCase()),
      )
      .sort();

    return files.map((file) => {
      const name = path.basename(file, path.extname(file));
      const username = usernameFor(name);

      return {
        name,
        username,
        email: `${username}@${EMAIL_DOMAIN}`,
        // spaces left as they are: the browser encodes them in an img src
        imageUrl: `${ASSET_PREFIX}/${file}`,
        biography: BIOGRAPHY,
      };
    });
  }

  loadPeople() {
    if (this.#people === null) {
      this.#people = this.#read(this.imageDir);
    }

    return this.#people;
  }

  getPeople() {
    if (this.#people === null) {
      throw new Error("People not loaded. Call loadPeople() first.");
    }

    return this.#people;
  }
}

export default new MicrosoftPeople();
