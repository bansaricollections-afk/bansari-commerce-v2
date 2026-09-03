/**
 * Add missing attribute options to the admin dropdowns.
 *
 * WHY
 * The product form's lookups were missing values the catalogue already uses, so
 * they had been typed as free text and were invisible to filtering:
 *   - fabric  "Pure Mul Mul Cotton"
 *   - colour  "BABY PINK", "Taupe Brown"
 * and values that appear in product names with no option at all — Chikankari,
 * Kalamkari, Denim, Royal Blue, Rama, Lime Yellow.
 *
 * SAFETY
 * - Dry run by default; pass --apply to write.
 * - Insert-only. Nothing is renamed, deactivated or deleted.
 * - Idempotent: an option whose slug already exists is skipped, so re-running
 *   adds nothing.
 * - Near-duplicates are deliberately NOT added. "Coral Pink", "Olive Green" and
 *   "Mustard Yellow" would each sit beside an existing shorter form and split
 *   the same filter in two.
 *
 * Usage:
 *   node scripts/seed-attribute-options.js            # dry run
 *   node scripts/seed-attribute-options.js --apply
 */
require('dotenv').config({ path: '.env.local', quiet: true });
const { createClient } = require('@supabase/supabase-js');

const APPLY = process.argv.includes('--apply');

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const slugify = (v) =>
  v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/*
 * Requested by the business are marked. Everything else is standard Indian
 * ethnic-wear vocabulary that the current lists omit.
 */
const ADDITIONS = {
  attr_fabric: [
    'Mul Mul', 'Muslin', 'Mul Chanderi Cotton', // Mul Chanderi requested
    'Shimmer',                                   // requested
    'Shinon',                                    // requested
    'Khadi', 'Handloom Cotton', 'Cotton Blend', 'Cotton Linen',
    'Cambric', 'Poplin', 'Voile', 'Lawn',
    'Modal', 'Viscose', 'Denim', 'Organza', 'Satin', 'Brocade',
    'Kota Doria', 'Maheshwari', 'Dola Silk',
  ],
  attr_color: [
    'Lime Yellow',  // requested
    'Rama',         // requested
    'Baby Pink', 'Taupe',
    'Royal Blue', 'Light Blue', 'Powder Blue', 'Peacock Blue',
    'Sea Green', 'Sage Green', 'Mehendi Green', 'Emerald',
    'Rust Orange', 'Terracotta', 'Mocha', 'Chikoo',
    'Onion Pink', 'Fuchsia', 'Burgundy', 'Nude', 'Lilac',
  ],
  attr_neck: [
    'Keyhole Neck', 'Notched Neck', 'Round Split Neck', 'Angrakha',
    'Chinese Collar', 'U-Neck', 'Scoop Neck', 'Halter Neck', 'Asymmetric Neck',
  ],
  attr_sleeve: [
    'Puff Sleeve', 'Balloon Sleeve', 'Flutter Sleeve', 'Bishop Sleeve',
    'Kimono Sleeve', 'Raglan Sleeve', 'Elbow Sleeve', 'Roll-up Sleeve',
  ],
  attr_fit: [
    'Anarkali', 'Kalidar', 'Umbrella', 'Panelled', 'Empire', 'High-Low', 'Kaftan',
  ],
  attr_work: [
    'Chikankari',   // already used by a product, no option existed
    'Patchwork',    // ditto
    'Gota Patti', 'Phulkari', 'Kantha', 'Aari Work', 'Mukaish',
    'Dori Work', 'Thread Work', 'Schiffli', 'Lace Work', 'Pearl Work',
  ],
  attr_pattern: [
    'Kalamkari',    // already used by a product, no option existed
    'Ajrakh', 'Batik', 'Leheriya', 'Paisley', 'Buti',
    'Stripes', 'Polka Dot', 'Tie Dye', 'Ombre',
  ],
  attr_occasion: [
    // These unlock occasion landing pages, which are currently impossible
    // because only 1 of 42 products carries an occasion tag.
    'Haldi', 'Mehendi', 'Sangeet', 'Navratri', 'Garba', 'Diwali',
    'Puja', 'Daily Wear', 'Engagement',
  ],
  /*
   * Kurta lengths. The existing list is DRESS lengths (Mini, Midi, Maxi), which
   * do not describe a kurta. The old values are left in place rather than
   * deleted — products may reference them — but the correct vocabulary is added
   * alongside so new products can be tagged properly.
   */
  attr_length: [
    'Hip Length', 'Thigh Length', 'Below Knee', 'Calf Length', 'Ankle Length', 'Floor Length',
  ],
};

(async () => {
  console.log(APPLY ? 'APPLY\n' : 'DRY RUN — nothing will be written\n');

  let wouldAdd = 0;
  let skipped = 0;

  for (const [table, names] of Object.entries(ADDITIONS)) {
    const { data: existing, error } = await db.from(table).select('id, name, slug');
    if (error) {
      console.log(`${table}: READ FAILED — ${error.message}`);
      continue;
    }

    const haveSlug = new Set((existing ?? []).map((r) => r.slug));
    const haveName = new Set((existing ?? []).map((r) => (r.name || '').toLowerCase()));
    const maxOrder = Math.max(0, ...(existing ?? []).map((r) => r.id ?? 0));

    const toInsert = [];
    for (const name of names) {
      const slug = slugify(name);
      if (haveSlug.has(slug) || haveName.has(name.toLowerCase())) {
        skipped++;
        continue;
      }
      toInsert.push({
        name,
        slug,
        active: true,
        sort_order: maxOrder + toInsert.length + 1,
        display_order: maxOrder + toInsert.length + 1,
      });
    }

    console.log(`${table.padEnd(15)} have ${String((existing ?? []).length).padStart(3)}  +${toInsert.length}`);
    if (toInsert.length) console.log(`  ${toInsert.map((r) => r.name).join(', ')}`);
    wouldAdd += toInsert.length;

    if (APPLY && toInsert.length) {
      const { error: insErr } = await db.from(table).insert(toInsert);
      if (insErr) console.log(`  INSERT FAILED — ${insErr.message}`);
    }
  }

  console.log('\n' + '-'.repeat(60));
  console.log(`${APPLY ? 'inserted' : 'would insert'} ${wouldAdd} options; ${skipped} already present`);
  if (!APPLY) console.log('\nRe-run with --apply to write.');
})();
