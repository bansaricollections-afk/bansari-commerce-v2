/**
 * One-off: set the Work attribute on every active product still missing it.
 *
 * WHAT "WORK" MEANS HERE
 * attr_work is surface embellishment — embroidery, mirror work, zari, applique
 * and so on. Its `Plain` option means the garment carries no such work, which
 * is a real, useful statement for a printed piece: the decoration is in the
 * print, not stitched onto it. A shopper choosing between an embroidered kurta
 * and a printed one is asking exactly this question.
 *
 * HOW EACH VALUE WAS DECIDED
 * By reading the product's own description for embellishment language. Only
 * one product of the twenty describes any: the Navy Blue Denim set, whose copy
 * reads "The panel incorporates mirror work, geometric embroidery and
 * handcrafted tassel detailing". Every other description talks only about
 * prints and silhouette.
 *
 * Two near-misses worth recording, because both looked like embellishment in a
 * keyword scan and neither is:
 *   - "lace" in the Red & White Shirt Collar Dress is inside the word
 *     "placement".
 *   - "patchwork" in the Teal Blue dress is "patchwork-INSPIRED print" — a
 *     printed effect, not pieced fabric.
 *
 * Run with --apply to write; without it, prints the plan and touches nothing.
 */
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const WORK_PLAIN = 1;
const WORK_EMBROIDERED = 2;

/** The one product whose copy describes actual embellishment. */
const EMBELLISHED = {
  13: {
    value: WORK_EMBROIDERED,
    evidence: '"The panel incorporates mirror work, geometric embroidery and handcrafted tassel detailing"',
  },
};

const APPLY = process.argv.includes('--apply');

/** Words that would mean a product is NOT plain. Used as a safety net. */
const EMBELLISHMENT = /\b(mirror work|chikankari|appliqu|hand ?paint|zari|sequin|zardozi|gota|phulkari|kantha|aari work|mukaish|dori work|thread work|embroider\w*|schiffli|pearl work|cutwork|resham)\b/i;

async function main() {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, description, attr_work_id')
    .eq('active', true)
    .is('attr_work_id', null)
    .order('id');
  if (error) throw error;

  console.log(APPLY ? '=== APPLYING ===' : '=== DRY RUN (pass --apply to write) ===');
  console.log(`${data.length} active products are missing Work\n`);

  const plan = [];
  for (const p of data) {
    const override = EMBELLISHED[p.id];
    if (override) {
      plan.push({ ...p, value: override.value, label: 'Embroidered', why: override.evidence });
      continue;
    }

    /*
     * Safety net. If a description mentions embellishment and this product is
     * not in EMBELLISHED, the plan is out of date — skip rather than assert
     * "Plain" over something the copy contradicts.
     */
    const hit = (p.description || '').match(EMBELLISHMENT);
    if (hit) {
      plan.push({ ...p, value: null, label: 'SKIPPED', why: `description mentions "${hit[0]}" — needs a human decision` });
      continue;
    }

    plan.push({ ...p, value: WORK_PLAIN, label: 'Plain', why: 'no embellishment described; decoration is print only' });
  }

  for (const p of plan) {
    console.log(`  ${p.label.padEnd(12)} ${p.name.slice(0, 52)}`);
    console.log(`  ${''.padEnd(12)} ${p.why}`);
  }

  if (!APPLY) return;

  const stamp = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(
    `work-attribute-rollback-${stamp}.json`,
    JSON.stringify(data.map(({ id, name, attr_work_id }) => ({ id, name, attr_work_id })), null, 2)
  );
  console.log(`\nrollback written to work-attribute-rollback-${stamp}.json`);

  let ok = 0, skipped = 0;
  for (const p of plan) {
    if (p.value === null) { skipped++; continue; }
    const { error: e } = await supabase
      .from('products')
      .update({ attr_work_id: p.value, updated_at: new Date().toISOString() })
      .eq('id', p.id);
    if (e) console.log(`  FAILED ${p.name.slice(0, 40)}: ${e.message}`);
    else ok++;
  }
  console.log(`updated ${ok}, skipped ${skipped}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
