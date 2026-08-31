/** Crawl every sitemap URL and report on-page SEO signals. */
const SITE = process.env.SEO_SITE || 'https://www.bansaricollection.in';

const pick = (html, re) => { const m = html.match(re); return m ? m[1] : null; };
const decode = (s) => (s || '').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"');

(async () => {
  const xml = (await (await fetch(`${SITE}/sitemap.xml`)).text()).replace(/https:\/\/www\.bansaricollection\.in/g, SITE);
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

  const rows = [];
  const CONC = 5;
  for (let i = 0; i < urls.length; i += CONC) {
    await Promise.all(urls.slice(i, i + CONC).map(async (u) => {
      try {
        const res = await fetch(u, { redirect: 'follow' });
        const html = await res.text();
        const path = new URL(u).pathname || '/';
        const canonical = pick(html, /<link rel="canonical" href="([^"]+)"/);
        const canonPath = canonical ? (new URL(canonical).pathname || '/') : null;
        rows.push({
          path,
          status: res.status,
          title: decode(pick(html, /<title>([^<]*)<\/title>/)),
          desc: decode(pick(html, /<meta name="description" content="([^"]*)"/)),
          canonical: canonPath,
          canonOk: canonPath === path,
          h1: (html.match(/<h1/g) || []).length,
          jsonld: (html.match(/application\/ld\+json/g) || []).length,
          ogImage: /property="og:image"/.test(html),
          noindex: /content="[^"]*noindex/.test(html),
        });
      } catch (e) { rows.push({ path: u, status: 0, err: String(e).slice(0, 40) }); }
    }));
  }

  rows.sort((a, b) => a.path.localeCompare(b.path));

  const bad = (c) => (c ? '' : ' <<');
  console.log(`\n${rows.length} URLs in sitemap\n`);
  console.log('CANONICAL MISMATCHES (page tells Google it is a duplicate)');
  console.log('-'.repeat(70));
  const mism = rows.filter((r) => r.canonical && !r.canonOk);
  mism.forEach((r) => console.log(`  ${r.path.padEnd(34)} -> ${r.canonical}`));
  if (!mism.length) console.log('  none');

  console.log('\nMISSING CANONICAL');
  rows.filter((r) => r.status === 200 && !r.canonical).forEach((r) => console.log(`  ${r.path}`));

  console.log('\nTITLE LENGTH (ideal 50-60)');
  console.log('-'.repeat(70));
  rows.filter((r) => r.title).forEach((r) => {
    const n = r.title.length;
    if (n > 60 || n < 30) console.log(`  ${String(n).padStart(3)}  ${r.path.padEnd(30)} ${r.title.slice(0, 60)}`);
  });

  console.log('\nDUPLICATE BRAND SUFFIX IN TITLE');
  rows.filter((r) => r.title && (r.title.match(/Bansari Collection/g) || []).length > 1)
    .forEach((r) => console.log(`  ${r.path}`));

  console.log('\nDESCRIPTION LENGTH (ideal 150-160)');
  console.log('-'.repeat(70));
  rows.filter((r) => r.status === 200).forEach((r) => {
    const n = (r.desc || '').length;
    if (!r.desc) console.log(`  MISSING  ${r.path}`);
    else if (n > 165 || n < 120) console.log(`  ${String(n).padStart(3)}      ${r.path}`);
  });

  console.log('\nOTHER');
  console.log('-'.repeat(70));
  rows.filter((r) => r.status !== 200).forEach((r) => console.log(`  status ${r.status}  ${r.path}`));
  rows.filter((r) => r.noindex).forEach((r) => console.log(`  NOINDEX  ${r.path}`));
  rows.filter((r) => r.h1 !== 1).forEach((r) => console.log(`  h1 count ${r.h1}  ${r.path}`));
  rows.filter((r) => r.status === 200 && !r.ogImage).forEach((r) => console.log(`  no og:image  ${r.path}`));
  rows.filter((r) => r.status === 200 && r.jsonld === 0).forEach((r) => console.log(`  no JSON-LD  ${r.path}`));

  const dupT = {};
  rows.forEach((r) => { if (r.title) (dupT[r.title] ||= []).push(r.path); });
  const dups = Object.entries(dupT).filter(([, v]) => v.length > 1);
  console.log('\nDUPLICATE TITLES');
  dups.forEach(([t, v]) => console.log(`  ${v.length}x  ${t.slice(0, 50)}  ${v.join(', ').slice(0, 60)}`));
  if (!dups.length) console.log('  none');
})();
