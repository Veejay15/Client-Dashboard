#!/usr/bin/env node
/* ==========================================================================
   Monthly Local Dominator scans — one-time setup per client
   --------------------------------------------------------------------------
   Creates one monthly scheduled campaign per tracked keyword (1st of the
   month), copying the grid of that keyword's latest scan. Keywords that
   already have their own campaign are left alone. Each campaign is also
   what powers the dashboard's "Request a fresh scan" button.

     node scripts/ld-monthly-setup.js <client>            dry run — prints the plan
     node scripts/ld-monthly-setup.js <client> --apply    creates the campaigns

   Needs LD_API_KEY — from the environment, or a git-ignored .env.local file
   in the repo root containing the line:  LD_API_KEY=your-key
   Runs from this computer only; the website cannot create campaigns.
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");
const CLIENTS = require("../api/_lib/clients");
const { fetchClientGrid, planMonthly, createCampaign, MONTHLY_CRON } = require("../api/_lib/localDominator");

function loadKey() {
  if (process.env.LD_API_KEY) return process.env.LD_API_KEY.trim();
  const file = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(file)) return null;
  const line = fs.readFileSync(file, "utf8").split(/\r?\n/).find(l => /^\s*LD_API_KEY\s*=/.test(l));
  return line ? line.split("=").slice(1).join("=").trim().replace(/^["']|["']$/g, "") : null;
}

const mi = m => (m ? (m / 1609.344).toFixed(2).replace(/0$/, "") + " mi" : "?");

async function main() {
  const [clientId, flag] = process.argv.slice(2);
  const apply = flag === "--apply";
  const client = CLIENTS[clientId];
  if (!client) {
    console.error(`Usage: node scripts/ld-monthly-setup.js <${Object.keys(CLIENTS).join("|")}> [--apply]`);
    process.exit(2);
  }
  const key = loadKey();
  if (!key) {
    console.error("LD_API_KEY not found. Add it to .env.local in the repo root (see the header of this file).");
    process.exit(2);
  }

  console.log(`\nLocal Dominator — monthly scans for ${client.name}`);
  console.log(`Schedule: "${MONTHLY_CRON}" (1st of each month, 13:00 UTC)\n`);

  const grid = await fetchClientGrid(client, key);
  grid.errors.forEach(e => console.warn(`warning: ${e.message}`));
  if (!grid.keywords.length) {
    console.log("No scans found for this client — nothing to copy a grid from.");
    return;
  }

  const plan = planMonthly(client, grid);
  const w = Math.max(...plan.items.map(i => i.kw.length), 7);
  console.log(`${"Keyword".padEnd(w)}  Action   Grid          Spacing   Pins`);
  console.log(`${"-".repeat(w)}  -------  ------------  --------  ----`);
  for (const i of plan.items) {
    const g = i.gridSize ? `${i.gridSize}×${i.gridSize} ${i.shape}` : "?";
    const note = i.action === "keep" ? "  (already has its own campaign)"
      : i.action === "blocked" ? `  (missing: ${i.missing.join(", ")})` : "";
    console.log(`${i.kw.padEnd(w)}  ${i.action.padEnd(7)}  ${g.padEnd(12)}  ${mi(i.spacingM).padEnd(8)}  ${String(i.points ?? "?").padStart(4)}${note}`);
  }

  const creating = plan.items.filter(i => i.action === "create");
  console.log(`\nNew campaigns: ${creating.length}`);
  console.log(`Pins per month from NEW campaigns:   ${plan.newPointsPerMonth}`);
  console.log(`Pins per month across ALL campaigns: ${plan.totalPointsPerMonth}`);
  console.log("(Local Dominator bills per pin checked; confirm the credit rate on your plan.)");
  console.log(`Each "Request a fresh scan" click costs that keyword's pins again (max once per 7 days per keyword).\n`);

  if (!apply) {
    console.log("Dry run — nothing was created. Re-run with --apply to create the campaigns above.");
    return;
  }
  if (!creating.length) {
    console.log("Nothing to create.");
    return;
  }

  for (const i of creating) {
    try {
      const r = await createCampaign(i.body, key);
      console.log(`created  ${i.kw}  → ${(r.data && r.data.id) || "(id not returned)"}`);
    } catch (e) {
      console.error(`FAILED   ${i.kw}  → ${e.message}`);
      process.exitCode = 1;
    }
  }
}

main().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});
