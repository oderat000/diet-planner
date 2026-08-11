import { createHash, randomBytes } from "node:crypto";
import nextEnv from "@next/env";
import { hash as argonHash } from "@node-rs/argon2";
import { Redis } from "@upstash/redis";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

if (process.env.CONFIRM_DELETE_ALL_ACCOUNTS !== "YES") {
  throw new Error("Set CONFIRM_DELETE_ALL_ACCOUNTS=YES to run this destructive maintenance task.");
}

const email = (process.env.DEV_ACCOUNT_EMAIL ?? "").trim().toLowerCase();
const username = (process.env.DEV_ACCOUNT_USERNAME ?? "").trim();
const password = process.env.DEV_ACCOUNT_PASSWORD ?? "";
if (!email || !username || password.length < 10) {
  throw new Error("DEV_ACCOUNT_EMAIL, DEV_ACCOUNT_USERNAME, and a 10+ character DEV_ACCOUNT_PASSWORD are required.");
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

async function scan(pattern) {
  const found = [];
  let cursor = "0";
  do {
    const [next, keys] = await redis.scan(cursor, { match: pattern, count: 250 });
    found.push(...keys);
    cursor = next;
  } while (cursor !== "0");
  return found;
}

const patterns = ["user:*", "session:*", "verify:*", "reset:*", "activity:*", "dp-auth:*"];
const keys = [...new Set((await Promise.all(patterns.map(scan))).flat())];
for (let i = 0; i < keys.length; i += 100) {
  await redis.del(...keys.slice(i, i + 100));
}

const id = randomBytes(16).toString("base64url");
const emailHash = createHash("sha256")
  .update(email + (process.env.AUTH_PEPPER ?? ""))
  .digest("hex");
const passwordHash = await argonHash(password, {
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
});
const createdAt = new Date().toISOString();

await redis.set(`user:email:${emailHash}`, id);
await redis.set(`user:username:${username.toLowerCase()}`, id);
await redis.hset(`user:${id}`, {
  id,
  username,
  email,
  emailHash,
  passwordHash,
  emailVerified: "true",
  createdAt,
  lastLoginAt: "",
});

const [userKeys, emailIndex, usernameIndex] = await Promise.all([
  scan("user:*") ,
  redis.get(`user:email:${emailHash}`),
  redis.get(`user:username:${username.toLowerCase()}`),
]);

if (emailIndex !== id || usernameIndex !== id || userKeys.length !== 3) {
  throw new Error("Account reset verification failed.");
}

console.log(`Removed ${keys.length} auth keys and provisioned one verified dev account (${username}, ${email}).`);
