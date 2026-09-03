/**
 * Downloads the brand assets used by the site (team logos + the IDL wordmark)
 * from idl.pro's Framer CDN into public/assets/ so the build is self-contained
 * and nothing is hot-linked.
 *
 * Usage:  npm run assets
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/assets");
const CDN = "https://framerusercontent.com/images/";

// Team wordmark / logo lockups, lifted from each team page's hero.
const TEAM_LOGOS = {
  brotherhood: "wbZd1DQzs4xeClHlt2sdhENcc.webp",
  grv: "LAKWPGr5Npx3Np58Xk6lNsnkuw.webp",
  "1-million": "dE41qgpZ0AmvnpJr2hz9JaGY.webp",
  "royal-family": "IgptOKn926EKU36LbhFj9RDHU.webp",
  "jam-republic": "DX5jGwO0GCzK1BKqYN6l8JnZu0.webp",
  "quick-style": "UipIJ0WFlEUXjSDZ3efUQI.webp",
};

const MISC = {
  "idl-icon.png": "8zt98Modl3iXfmZpbL1XWJ6mhM.png", // IDL logo lockup (apple-touch-icon)
  "idl-mark.png": "nrUJk5c3j2J0DXSBMAoKTxSa9E.png", // IDL favicon
};

// Press-kit "Go Gold" primary logo (lime IDL lettermark on asphalt), used
// for the hero + masthead. https://www.idl.pro/press-kit
const PRESS_KIT_GO_GOLD =
  "https://framerusercontent.com/assets/RVAnCD6HckkjcfUPCyJP8z05Jo.png";

async function grab(url, dest) {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (idl-stats asset fetch)" },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, buf);
  console.log(`  ${dest.replace(OUT + "/", "")}  (${(buf.length / 1024).toFixed(1)} KB)`);
}

async function main() {
  console.log("· team logos");
  for (const [id, file] of Object.entries(TEAM_LOGOS)) {
    // webp: request a 2x-ish width so it stays crisp
    await grab(`${CDN}${file}?width=600`, resolve(OUT, "logos", `${id}.webp`));
  }
  console.log("· idl logo");
  for (const [name, file] of Object.entries(MISC)) {
    await grab(`${CDN}${file}${name.endsWith(".png") ? "?width=360" : ""}`, resolve(OUT, name));
  }

  // Hero / masthead logo: the press-kit "Go Gold" lockup has a lot of
  // whitespace, so crop the padding to the lettermark. macOS `sips` only — if
  // it's missing, the committed idl-hero.png stays as-is.
  const goGoldFull = resolve(OUT, "idl-hero-src.png");
  await grab(PRESS_KIT_GO_GOLD, goGoldFull);
  const hero = resolve(OUT, "idl-hero.png");
  try {
    execFileSync(
      "sips",
      ["-c", "760", "2180", "--cropOffset", "670", "780", goGoldFull, "--out", hero],
      { stdio: "ignore" }
    );
    execFileSync("sips", ["-Z", "1000", hero], { stdio: "ignore" });
    execFileSync("rm", [goGoldFull]);
    console.log("  idl-hero.png  (cropped from press-kit Go Gold logo)");
  } catch {
    console.log("  idl-hero.png  (skipped — needs macOS `sips`; keeping committed copy)");
  }

  console.log("\n✓ assets written to public/assets/");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
