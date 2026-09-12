import bcrypt from "bcrypt";
import linkedin_ghastliness from "../models/linkedin.ghastliness.js";
import microsoft_people from "../models/microsoft.people.js";
import skill_catalogue from "../models/skill.catalogue.js";
import User from "../models/user.model.js";
import Post from "../models/post.model.js";
import Comment from "../models/comment.model.js";
import Connection from "../models/connection.model.js";
import Skill from "../models/skill.model.js";
import { fail } from "../utils/response.utils.js";

const defaultRoute = (req, res) => {
  // #swagger.summary = 'Basic service health check endpoint'
  // #swagger.description = 'Only unauthenticated endpoint (other than api-docs). Returns a welcome message and timestamp.'
  // #swagger.responses[200] = { description: 'Service is running and accessible' }
  // #swagger.security = []

  res.json({
    message: "Welcome to the LinkedInClone Server",
    timestamp: new Date().toLocaleString(),
  });
};

const POST_WINDOW_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

const randomInt = (max) => Math.floor(Math.random() * max);

// a random moment in the last `days` days, at a plausible hour of the day
const randomPastDate = (days) => {
  const now = Date.now();
  const date = new Date(now - randomInt(days) * DAY_MS);
  date.setHours(7 + randomInt(17), randomInt(60), randomInt(60), 0);

  // today's slot can roll past the current time; drop it back a day if so
  return date.getTime() > now ? new Date(date.getTime() - DAY_MS) : date;
};

const randomDateBetween = (start, end) =>
  new Date(start.getTime() + randomInt(end.getTime() - start.getTime() + 1));

// these accounts exist only so the front-end has something to log in as
const SEED_PASSWORD = "testing";

// roughly ten skills a head, weighted so a profile reads as a professional with
// one or two alarming hobbies rather than a uniform random smear
const SKILL_MIX = { technical: 4, business: 4, extreme: 2 };

// draws `count` entries at random without replacement, leaving `pool` alone
const drawFrom = (pool, count) => {
  const remaining = [...pool];
  const drawn = [];

  for (let i = 0; i < count && remaining.length; i++) {
    drawn.push(...remaining.splice(randomInt(remaining.length), 1));
  }

  return drawn;
};

const restoreDB = async (req, res) => {
  // #swagger.summary = 'Admin-only reseed of the non-admin users, skills, posts, comments and connections'
  // #swagger.description = 'Requires a Bearer token belonging to an administrator. Wipes every skill, post, comment, connection and non-admin user, then recreates one test user per headshot in models/microsoft (username <forename><surname initial>, email <username>@microsoft.com, password "testing"), with 5 posts each, 0-4 comments on every post, a randomised network of accepted and pending connections, all backdated to random times over the last 60 days, and the 60-skill catalogue with roughly ten skills allotted to each user. Administrators are left untouched.'
  // #swagger.responses[200] = { description: 'Successfully restored database with users, posts, comments and connections' }
  // #swagger.responses[401] = { description: 'Invalid or missing API token' }
  // #swagger.responses[403] = { description: 'Admin privileges required' }
  // #swagger.responses[500] = { description: 'Failed to restore database' }

  try {
    const now = new Date();

    // read the seed images before deleting anything: there is no point wiping a
    // database we then can't repopulate
    const people = microsoft_people.getPeople();
    if (!people.length) {
      return fail(res, 500, "No seed images found in models/microsoft");
    }

    const catalogue = skill_catalogue.getSkills();
    if (!catalogue.length) {
      return fail(
        res,
        500,
        "No seed skills found in models/skills_catalogue.json",
      );
    }

    // wipe comments too: this bulk deleteMany bypasses the cascade in deletePost()
    await Comment.deleteMany({});
    await Post.deleteMany({});
    await Connection.deleteMany({});
    // user-added skills go with the catalogue: every non-admin user who could
    // have added one is about to be deleted anyway, and a survivor would collide
    // with the catalogue's unique keys
    await Skill.deleteMany({});
    // no need for deleteUser()'s $pull pass over likes arrays: every post and
    // comment that could have held a reference has just gone
    await User.deleteMany({ isAdmin: false });

    // hashed once and shared: 10 rounds costs ~100ms a call, and these are
    // throwaway accounts that all share the one password anyway
    const password = await bcrypt.hash(SEED_PASSWORD, 10);
    const users = await User.insertMany(
      people.map((person) => ({ ...person, password })),
    );

    // no createdBy: the catalogue is house-supplied, so only an admin can edit it
    const createdSkills = await Skill.insertMany(catalogue);

    // grouped once, then drawn from per user
    const skillsByCategory = Object.fromEntries(
      Object.keys(SKILL_MIX).map((category) => [
        category,
        createdSkills.filter((skill) => skill.category === category),
      ]),
    );

    const skillOps = users.map((user) => {
      const drawn = Object.entries(SKILL_MIX).flatMap(([category, count]) =>
        // the mix is a target, not a quota: a plus or minus one either way keeps
        // two profiles from looking identically composed
        drawFrom(skillsByCategory[category], count + randomInt(3) - 1).map(
          (skill) => skill._id,
        ),
      );

      // insertMany handed back documents, not a live view of the collection;
      // setting this keeps them in step with the write below, so the response
      // shows each user's portfolio
      user.skills = drawn;

      return {
        updateOne: {
          filter: { _id: user._id },
          update: { $set: { skills: drawn } },
        },
      };
    });

    // timestamps: false so the accounts keep the createdAt they were inserted with
    await User.bulkWrite(skillOps, { timestamps: false });

    const posts = [];
    for (const user of users) {
      posts.push(...linkedin_ghastliness.getPosts(user._id, 5));
    }

    // give roughly half the seeded posts a picsum.photos placeholder
    for (const [i, post] of posts.entries()) {
      if (Math.random() < 0.5) {
        post.imageUrl = `https://picsum.photos/seed/fsd${i}-${Date.now()}/600/400`;
      }
    }

    // scatter the posts back over the last couple of months so a feed sorted by
    // date looks lived-in rather than every post sharing one insert timestamp
    for (const post of posts) {
      post.createdAt = randomPastDate(POST_WINDOW_DAYS);
      post.updatedAt = post.createdAt;
    }
    posts.sort((a, b) => a.createdAt - b.createdAt);

    // timestamps: false so Mongoose keeps the dates above instead of stamping now
    const createdPosts = await Post.insertMany(posts, { timestamps: false });

    // built from the created posts, only those carry the _id a comment points at
    const comments = [];
    for (const post of createdPosts) {
      const commentCount = randomInt(5); // 0-4 per post
      for (let i = 0; i < commentCount; i++) {
        const commenter = users[randomInt(users.length)];
        const [comment] = linkedin_ghastliness.getComments(commenter._id, 1);
        // a reply lands somewhere between its post going up and now
        const createdAt = randomDateBetween(post.createdAt, now);
        comments.push({
          ...comment,
          post: post._id,
          createdAt,
          updatedAt: createdAt,
        });
      }
    }
    comments.sort((a, b) => a.createdAt - b.createdAt);
    const createdComments = await Comment.insertMany(comments, {
      timestamps: false,
    });

    // random likers per doc, one bulkWrite per collection rather than a save() each
    const likeOps = (docs) =>
      docs.map((doc) => ({
        updateOne: {
          filter: { _id: doc._id },
          update: {
            $set: {
              likes: users.filter(() => Math.random() < 0.4).map((u) => u._id),
            },
          },
        },
      }));

    // timestamps: false again, otherwise the like pass resets every updatedAt
    if (createdPosts.length)
      await Post.bulkWrite(likeOps(createdPosts), { timestamps: false });
    if (createdComments.length)
      await Comment.bulkWrite(likeOps(createdComments), { timestamps: false });

    // give the seeded users a network: walk every unordered pair once and roll
    // for an accepted connection, a request still waiting, or nothing at all
    const connections = [];
    for (let i = 0; i < users.length; i++) {
      for (let j = i + 1; j < users.length; j++) {
        const roll = Math.random();
        if (roll >= 0.6) continue;

        // either of the pair could have been the one who asked
        const [requester, recipient] =
          Math.random() < 0.5 ? [users[i], users[j]] : [users[j], users[i]];
        const accepted = roll < 0.45;
        const createdAt = randomPastDate(POST_WINDOW_DAYS);

        connections.push({
          requester: requester._id,
          recipient: recipient._id,
          status: accepted ? "accepted" : "pending",
          createdAt,
          // an acceptance lands after the request, a pending one never moved
          updatedAt: accepted ? randomDateBetween(createdAt, now) : createdAt,
        });
      }
    }
    connections.sort((a, b) => a.createdAt - b.createdAt);
    const createdConnections = await Connection.insertMany(connections, {
      timestamps: false,
    });

    // insertMany hands back the documents it was given, hash included; select:
    // false only hides the field on a query
    for (const user of users) {
      user.password = undefined;
    }

    res.json({
      status: "success",
      timestamp: new Date().toLocaleString(),
      data: {
        users,
        skills: createdSkills,
        posts: createdPosts,
        comments: createdComments,
        connections: createdConnections,
      },
    });
  } catch (error) {
    console.error("Error restoring database:", error);
    return fail(res, 500, "Failed to restore database");
  }
};

export { defaultRoute, restoreDB };
