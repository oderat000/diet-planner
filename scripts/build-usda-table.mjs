/**
 * Builds the bundled USDA nutrition table.
 *
 * Downloads USDA FoodData Central's SR Legacy release — the US government's measured
 * food composition data — and reduces it to the four nutrients this app needs. The
 * output is committed to the repo so the app needs no API key, no network, and hits
 * no rate limits, while every number still traces back to a real USDA measurement.
 *
 *   node --max-old-space-size=4096 scripts/build-usda-table.mjs
 */
import { createWriteStream } from "node:fs";
import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const RELEASE = "2021-10-28";
const URL = `https://fdc.nal.usda.gov/fdc-datasets/FoodData_Central_sr_legacy_food_json_${RELEASE}.zip`;
const CACHE_DIR = path.join(process.cwd(), ".cache");
const ZIP = path.join(CACHE_DIR, "sr_legacy.zip");
const RAW = path.join(CACHE_DIR, `FoodData_Central_sr_legacy_food_json_${RELEASE}.json`);
const OUT = path.join(process.cwd(), "src", "data", "usda-foods.json");

// USDA nutrient ids
const ENERGY_KCAL = 1008;
const PROTEIN = 1003;
const FAT = 1004;
const CARBS = 1005;

async function exists(p) {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function download() {
  if (await exists(RAW)) {
    console.log("Using cached raw dataset.");
    return;
  }
  await mkdir(CACHE_DIR, { recursive: true });

  if (!(await exists(ZIP))) {
    console.log(`Downloading ${URL} ...`);
    const res = await fetch(URL);
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    await pipeline(Readable.fromWeb(res.body), createWriteStream(ZIP));
  }

  console.log("Extracting ...");
  // PowerShell is always present on Windows; unzip is not.
  await execFileAsync("powershell", [
    "-NoProfile",
    "-Command",
    `Expand-Archive -LiteralPath '${ZIP}' -DestinationPath '${CACHE_DIR}' -Force`,
  ]);
}

function nutrients(food) {
  const out = {};
  for (const fn of food.foodNutrients ?? []) {
    const id = fn?.nutrient?.id;
    const unit = (fn?.nutrient?.unitName ?? "").toUpperCase();
    const amount = Number(fn?.amount);
    if (!Number.isFinite(amount)) continue;
    // USDA reports energy in both kJ and kcal; only the kcal row is wanted
    if (id === ENERGY_KCAL && unit !== "KCAL") continue;
    if (out[id] === undefined) out[id] = amount;
  }
  return out;
}

async function main() {
  await download();

  console.log("Parsing (this takes a moment) ...");
  const data = JSON.parse(await readFile(RAW, "utf8"));
  const foods = data.SRLegacyFoods ?? [];
  console.log(`${foods.length} SR Legacy foods.`);

  const table = [];
  for (const food of foods) {
    const description = String(food?.description ?? "").trim();
    if (!description) continue;

    const n = nutrients(food);
    const kcal = n[ENERGY_KCAL];
    // A food with no measured energy is useless to us — drop it rather than assume zero.
    if (kcal === undefined) continue;

    table.push({
      d: description,
      i: Number(food?.fdcId ?? 0),
      k: Math.round(kcal * 10) / 10,
      p: Math.round((n[PROTEIN] ?? 0) * 10) / 10,
      c: Math.round((n[CARBS] ?? 0) * 10) / 10,
      f: Math.round((n[FAT] ?? 0) * 10) / 10,
    });
  }

  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(table), "utf8");

  const { size } = await stat(OUT);
  console.log(`Wrote ${table.length} foods to ${path.relative(process.cwd(), OUT)} (${(size / 1e6).toFixed(1)} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
