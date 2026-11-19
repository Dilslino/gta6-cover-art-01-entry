// Leonida After Dark — gta6-cover-art-01 entry program (Node 22, standard
// library only). Hands the app in: copies app/ and screenshots/ from beside
// this file into the output directory and writes /output/dossier.json with
// buildDossier from the vendored make.fun library. The output is fully
// deterministic: same input files, same dossier bytes, every run. Outside
// the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   MAKEFUN_OUTPUT_DIR=/tmp/gca-out1 node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail loudly (non-zero exit) instead of handing in a half-built output.
if (!existsSync(join(here, 'app', 'index.html'))) {
  throw new Error('app/index.html is missing — cannot hand in this entry');
}

// Refuse a handoff the gate would refuse: more than 4 screenshots, or none.
const shotFiles = existsSync(join(here, 'screenshots'))
  ? readdirSync(join(here, 'screenshots')).filter((f) => !f.startsWith('.'))
  : [];
if (shotFiles.length === 0 || shotFiles.length > 4) {
  throw new Error(`expected 1-4 screenshots, found ${shotFiles.length}`);
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the other limits refuse an entry the scorer would refuse (more than
// 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB
// of app files in all, or a path under app/ over 1000 bytes).
const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

// Deterministic summary on stdout: counts and sizes only, never timestamps
// or absolute paths, so repeated runs print the same lines.
console.log(`dossier: ${statSync(dossierPath).size} bytes, screenshots: ${shotFiles.length}`);
