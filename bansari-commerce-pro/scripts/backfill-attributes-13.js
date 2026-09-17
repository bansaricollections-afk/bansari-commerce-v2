/**
 * One-off: backfill structured attributes for the 13 products that had none.
 *
 * WHY A SCRIPT AND NOT GUESSWORK
 * Every value below is taken from that product's OWN name or description —
 * the `evidence` field quotes the exact source text. Nothing is inferred from
 * what a garment "probably" is. Where a product's copy does not state a field,
 * it is left NULL and the specification table simply shows one row fewer,
 * which is the rule the table itself follows.
 *
 * Run with --apply to write. Without it, prints the plan and touches nothing.
 * Writes a rollback file containing the previous values before applying.
 */
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const F = { Silk:1, Cotton:2, Crepe:5, Linen:8, Rayon:9, MulMul:16 };
const FIT = { Regular:1, Straight:4, ALine:5, Flared:6, Anarkali:8, Relaxed:3 };
const NECK = { Round:1, V:2, Collar:4, RoundSplit:12 };
const SLV = { Sleeveless:1, ThreeQuarter:3, Full:4 };
const LEN = { Midi:3, Calf:11 };
const PAT = { Printed:2, Embroidered:3, Floral:7, Geometric:8 };
const OCC = { Casual:1, Festive:2 };
const WRK = { Embroidered:2, Mirror:5, HandPainted:7, Applique:9, Chikankari:12 };

/** Only fields the product's own copy states. Absent key = leave NULL. */
const PLAN = [
  { id: 1, set: { attr_fabric_id: F.Cotton, attr_pattern_id: PAT.Embroidered, attr_work_id: WRK.Embroidered, attr_occasion_id: OCC.Festive },
    evidence: '"Premium embroidered kurta set designed for festive celebrations"' },

  { id: 2, set: { attr_fabric_id: F.Rayon, attr_neck_id: NECK.RoundSplit, attr_sleeve_id: SLV.ThreeQuarter, attr_fit_id: FIT.Regular, attr_pattern_id: PAT.Embroidered, attr_work_id: WRK.Chikankari },
    evidence: 'name: "Round Split Neck, 3/4 Sleeves, Regular Fit"; "Hand Chikankari"' },

  { id: 3, set: { attr_fabric_id: F.MulMul, attr_fit_id: FIT.Anarkali, attr_neck_id: NECK.RoundSplit, attr_length_id: LEN.Calf, attr_pattern_id: PAT.Embroidered, attr_work_id: WRK.Chikankari },
    evidence: '"Pure Mul Mul Cotton", "Anarkali", "round split neckline", "calf-length", "Hand Chikankari"' },

  { id: 4, set: { attr_fabric_id: F.Cotton, attr_fit_id: FIT.Straight, attr_neck_id: NECK.Round, attr_sleeve_id: SLV.ThreeQuarter, attr_pattern_id: PAT.Embroidered, attr_work_id: WRK.Embroidered, attr_occasion_id: OCC.Festive },
    evidence: '"straight kurta with a round neck, three-quarter sleeves"; "for festive, ethnic and occasion wear"' },

  { id: 6, set: { attr_fabric_id: F.Cotton, attr_fit_id: FIT.ALine, attr_neck_id: NECK.Round, attr_sleeve_id: SLV.ThreeQuarter, attr_work_id: WRK.Applique, attr_occasion_id: OCC.Festive },
    evidence: 'name: "Applique Work A-Line"; "round neck, three-quarter regular sleeves"; "festive occasions"' },

  { id: 7, set: { attr_fabric_id: F.Cotton, attr_pattern_id: PAT.Embroidered, attr_work_id: WRK.Mirror },
    evidence: 'name: "Embroidered Mirror Work"; "embroidery enriched with mirror work across the yoke"' },

  { id: 9, set: { attr_fabric_id: F.Cotton, attr_fit_id: FIT.Relaxed, attr_neck_id: NECK.Collar, attr_sleeve_id: SLV.ThreeQuarter, attr_pattern_id: PAT.Floral, attr_work_id: WRK.HandPainted },
    evidence: '"relaxed button-front shirt with a structured collar and three-quarter sleeves"; "handpainted floral"' },

  { id: 16, set: { attr_fabric_id: F.Cotton, attr_neck_id: NECK.V, attr_sleeve_id: SLV.Full, attr_work_id: WRK.Applique },
    evidence: 'name: "Appliqué"; "V-neckline finished with fine stitch detailing, and long sleeves"' },

  { id: 22, set: { attr_fabric_id: F.Crepe, attr_neck_id: NECK.Collar, attr_sleeve_id: SLV.ThreeQuarter, attr_pattern_id: PAT.Printed },
    evidence: '"Natural Crepe Printed"; "structured collared neckline with button placket"; "3/4 sleeves"' },

  { id: 23, set: { attr_fabric_id: F.Cotton, attr_neck_id: NECK.Collar, attr_fit_id: FIT.ALine, attr_length_id: LEN.Midi, attr_pattern_id: PAT.Geometric },
    evidence: '"relaxed camp collar"; "Flared A-line silhouette"; "Midi length"; "red-and-white geometric print"' },

  { id: 25, set: { attr_fabric_id: F.Cotton, attr_neck_id: NECK.V, attr_sleeve_id: SLV.Sleeveless, attr_fit_id: FIT.ALine, attr_length_id: LEN.Midi, attr_pattern_id: PAT.Printed },
    evidence: '"V-neckline", "Sleeveless construction", "Midi length", "A-line", "Printed"' },

  { id: 26, set: { attr_fabric_id: F.Cotton, attr_neck_id: NECK.Round, attr_sleeve_id: SLV.Sleeveless, attr_fit_id: FIT.Flared, attr_length_id: LEN.Midi, attr_pattern_id: PAT.Floral },
    evidence: '"Round neckline", "Sleeveless design", "Midi length", "Full pleated / Flared", "floral-inspired print"' },

  { id: 34, set: { attr_fabric_id: F.Cotton, attr_fit_id: FIT.Straight, attr_neck_id: NECK.V, attr_sleeve_id: SLV.ThreeQuarter, attr_pattern_id: PAT.Embroidered, attr_work_id: WRK.Embroidered, attr_occasion_id: OCC.Festive },
    evidence: '"straight kurta features a subtle V-neck"; "3/4 sleeves"; "embroidered floral motif"; "refined festive look"' },
];

const COLS = ['attr_fabric_id','attr_fit_id','attr_neck_id','attr_sleeve_id','attr_length_id','attr_pattern_id','attr_occasion_id','attr_work_id'];
const APPLY = process.argv.includes('--apply');

async function main() {
  const ids = PLAN.map((p) => p.id);
  const { data: before, error } = await supabase
    .from('products')
    .select(['id','name',...COLS].join(','))
    .in('id', ids);
  if (error) throw error;

  /*
   * Refuse to overwrite. If a product already has any attribute set, someone
   * filled it by hand since this plan was written and their value wins.
   */
  const conflicts = before.filter((row) => COLS.some((c) => row[c]));
  if (conflicts.length) {
    console.log('ABORT — these already have attributes set, not overwriting:');
    conflicts.forEach((c) => console.log('   #' + c.id + '  ' + c.name.slice(0, 50)));
    return;
  }

  console.log(APPLY ? '=== APPLYING ===\n' : '=== DRY RUN (pass --apply to write) ===\n');
  for (const p of PLAN) {
    const row = before.find((b) => b.id === p.id);
    const blank = COLS.filter((c) => !(c in p.set)).map((c) => c.replace('attr_','').replace('_id',''));
    console.log('#' + String(p.id).padStart(2) + '  ' + row.name.slice(0, 52));
    console.log('     set   : ' + Object.entries(p.set).map(([k, v]) => k.replace('attr_','').replace('_id','') + '=' + v).join(', '));
    console.log('     left  : ' + (blank.length ? blank.join(', ') + '  (not stated in the product copy)' : 'nothing'));
    console.log('     source: ' + p.evidence);
    console.log('');
  }

  if (!APPLY) return;

  const stamp = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(`attribute-backfill-rollback-${stamp}.json`, JSON.stringify(before, null, 2));
  console.log(`rollback written to attribute-backfill-rollback-${stamp}.json`);

  let ok = 0;
  for (const p of PLAN) {
    const { error: e } = await supabase
      .from('products')
      .update({ ...p.set, updated_at: new Date().toISOString() })
      .eq('id', p.id);
    if (e) console.log('  FAILED #' + p.id + ': ' + e.message);
    else ok++;
  }
  console.log(`updated ${ok}/${PLAN.length} products`);
}

main().catch((e) => { console.error(e); process.exit(1); });
