/**
 * Read-only audit: does products.stock agree with the sum of its variants' stock?
 *
 * WHY
 * Order 11 decremented nothing because the line carried no variant_id, leaving
 * product 39 at stock 5 while its variants totalled 3. That drift is invisible
 * in the admin, so this sweeps every product and prints the disagreements.
 *
 * Writes nothing. Run:  node scripts/audit-stock-mismatch.js
 */
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

async function main() {
  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id, name, stock, active')
    .order('id');
  if (pErr) throw pErr;

  const { data: variants, error: vErr } = await supabase
    .from('product_variants')
    .select('id, product_id, size_label, stock, reserved_stock, status, deleted_at');
  if (vErr) throw vErr;

  const byProduct = new Map();
  for (const v of variants) {
    if (!byProduct.has(v.product_id)) byProduct.set(v.product_id, []);
    byProduct.get(v.product_id).push(v);
  }

  const mismatches = [];
  const noVariants = [];

  for (const p of products) {
    const vs = byProduct.get(p.id) || [];
    if (vs.length === 0) {
      noVariants.push(p);
      continue;
    }
    const sum = vs.reduce((n, v) => n + (v.stock || 0), 0);
    if (sum !== (p.stock || 0)) {
      mismatches.push({ product: p, variants: vs, sum });
    }
  }

  console.log(`Products: ${products.length}   Variants: ${variants.length}`);
  console.log(`Products with no variants: ${noVariants.length}`);
  console.log(`Stock mismatches: ${mismatches.length}\n`);

  if (noVariants.length) {
    console.log('--- NO VARIANTS (orders on these will NOT decrement stock) ---');
    for (const p of noVariants) {
      console.log(`  #${p.id}  stock=${p.stock}  ${p.active ? '' : '[inactive] '}${p.name}`);
    }
    console.log('');
  }

  if (mismatches.length) {
    console.log('--- MISMATCHED (products.stock != sum of variant stock) ---');
    for (const m of mismatches) {
      const { product: p, sum, variants: vs } = m;
      console.log(
        `\n  #${p.id}  product.stock=${p.stock}  variants sum=${sum}  ` +
        `diff=${(p.stock || 0) - sum}  ${p.active ? '' : '[inactive] '}${p.name}`
      );
      for (const v of vs.sort((a, b) => a.id - b.id)) {
        console.log(
          `      ${String(v.size_label || '?').padEnd(5)} stock=${v.stock}` +
          ` reserved=${v.reserved_stock || 0}${v.status === 'active' ? '' : ' [' + v.status + ']'}`
        );
      }
    }
    console.log('');
  }

  // Anything genuinely broken: negative stock, or reserved exceeding stock.
  const bad = variants.filter(
    (v) => (v.stock || 0) < 0 || (v.reserved_stock || 0) > (v.stock || 0)
  );
  if (bad.length) {
    console.log('--- NEGATIVE / OVER-RESERVED VARIANTS ---');
    for (const v of bad) {
      console.log(
        `  variant ${v.id} (product ${v.product_id}, ${v.size_label}) ` +
        `stock=${v.stock} reserved=${v.reserved_stock}`
      );
    }
  } else {
    console.log('No negative or over-reserved variants.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
