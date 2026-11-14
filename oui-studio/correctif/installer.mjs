// Partie MÉCANIQUE de l'installation (aucun quota Claude) : dépendances, navigateur de rendu, sons de synthèse,
// dossiers, sous-agents et skills copiés dans .claude/. Relançable sans risque : rien n'est écrasé sauf --force.
// Usage : node scripts/installer.mjs [--force]
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FORCE = process.argv.includes("--force");
const win = process.platform === "win32";
const npx = win ? "npx.cmd" : "npx", npm = win ? "npm.cmd" : "npm";
const etape = (t) => console.log(`\n== ${t}`);
// Sous Windows on lance npm avec le Node qui exécute ce script, sans passer par cmd.exe ni par un .cmd :
// dans l'appli du Microsoft Store (dossier WindowsApps), cmd.exe répondait « Accès refusé ».
const NPMCLI = path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
const REMOTION = path.join(ROOT, "node_modules", "@remotion", "cli", "remotion-cli.js");
const sh = (cmd, args) => {
  if (cmd === npm && fs.existsSync(NPMCLI)) return spawnSync(process.execPath, [NPMCLI, ...args], { cwd: ROOT, stdio: "inherit" });
  if (cmd === npx && args[0] === "remotion" && fs.existsSync(REMOTION)) return spawnSync(process.execPath, [REMOTION, ...args.slice(1)], { cwd: ROOT, stdio: "inherit" });
  return spawnSync(cmd, args, { cwd: ROOT, stdio: "inherit", shell: win });
};

const [maj] = process.versions.node.split(".").map(Number);
if (maj < 18) { console.error(`Node ${process.versions.node} est trop ancien : installe Node 22 LTS (https://nodejs.org) puis relance.`); process.exit(1); }

etape("1/5 Dépendances (Remotion, ffmpeg) : npm install");
if (sh(npm, ["install", "--no-fund", "--no-audit"]).status !== 0) { console.error("L'installation des dépendances (npm install) a échoué. Vérifie ta connexion internet, désactive un instant ton antivirus, puis appuie sur Réessayer."); process.exit(1); }

etape("2/5 Navigateur de rendu de Remotion (Chrome Headless Shell)");
if (sh(npx, ["remotion", "browser", "ensure"]).status !== 0) console.error("AVERTISSEMENT : navigateur de rendu non installé (connexion internet ?)." + (process.platform === "linux" ? "\nSous Linux, il faut aussi ces bibliothèques (Ubuntu / Debian) :\n  sudo apt-get install -y libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libgbm1 libasound2 libxrandr2 libxkbcommon0 libxfixes3 libxcomposite1 libxdamage1 libcups2 libcairo2 libpango-1.0-0\n(sur Ubuntu 24.04, libasound2 s'appelle libasound2t64). Détails : NOTICES.md." : ""));

etape("3/5 Dossiers de travail");
for (const d of ["projets", "out", "tmp", "public", "reserve", "marque", "file/a-faire", "file/en-cours", "file/fait", "assets/sfx", "assets/music", ".claude/agents", ".claude/skills"])
  fs.mkdirSync(path.join(ROOT, d), { recursive: true });

etape("4/5 Sons de synthèse (sans téléchargement, libres de droits)");
const synth = path.join(ROOT, "assets/sfx/synth");
if (FORCE || !fs.existsSync(path.join(synth, "whoosh_1.wav"))) spawnSync(process.execPath, ["scripts/sfx_synth.mjs", "kit", "assets/sfx/synth"], { cwd: ROOT, stdio: "inherit" }); // sans shell : le chemin de node peut contenir des espaces (C:\Program Files)
else console.log("déjà présents");

etape("5/5 Sous-agents et skills de l'agent (copiés dans .claude/)");
const copie = (src, dst) => {
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) { fs.mkdirSync(d, { recursive: true }); copie(s, d); }
    else if (FORCE || !fs.existsSync(d)) { fs.copyFileSync(s, d); console.log("  +", path.relative(ROOT, d)); }
  }
};
copie(path.join(ROOT, "agent/sous-agents"), path.join(ROOT, ".claude/agents"));
copie(path.join(ROOT, "agent/skills"), path.join(ROOT, ".claude/skills"));
const reglages = path.join(ROOT, ".claude/settings.json");
if (FORCE || !fs.existsSync(reglages)) fs.copyFileSync(path.join(ROOT, "agent/settings.json"), reglages);

console.log("\nVoix gratuite en français : rien de plus à installer (Microsoft Edge TTS, installée par npm install ; il faut seulement une connexion Internet quand l'agent fabrique une voix).");
console.log("\nInstallation mécanique terminée. Vérification : node scripts/verifier-installation.mjs");
