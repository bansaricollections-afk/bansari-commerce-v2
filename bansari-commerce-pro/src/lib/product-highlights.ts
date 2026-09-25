/*
 * Product highlights — the two or three concrete facts that make a piece
 * worth buying, shown as chips beside the price and one badge on the card.
 *
 * Only ever derived from what the merchant entered: the Work and Fabric
 * attributes picked from Admin's controlled lists, and the product's own
 * title. Nothing is inferred from marketing copy, and nothing generic
 * ("premium quality") is ever emitted — if a product has no specific fact to
 * show, it shows no chips. A wrong highlight costs more trust than none.
 */

export type HighlightKind = "craft" | "fabric" | "set" | "feature";
export type Highlight = { kind: HighlightKind; label: string };

/* Title keywords, most distinctive first — the first match wins. */
const CRAFTS: [RegExp, string][] = [
  [/mirror/i, "Mirror Work"],
  [/bandhani|bandhej/i, "Bandhani"],
  [/ajrakh/i, "Ajrakh Print"],
  [/chikankari/i, "Chikankari"],
  [/gota/i, "Gota Work"],
  [/sequin/i, "Sequin Work"],
  [/hand ?block/i, "Hand Block Print"],
  [/hand ?painted/i, "Hand-painted"],
  [/appliqu/i, "Appliqué Work"],
  [/cutwork|lace/i, "Cutwork Lace"],
  [/patchwork/i, "Patchwork"],
  [/anarkali/i, "Anarkali"],
  [/embroider/i, "Embroidered"],
];

/* Work attribute values that describe nothing worth highlighting. */
const PLAIN_WORK = /^(none|plain|solid|n\/?a|-)$/i;

const BOTTOMS: [RegExp, string][] = [
  [/palazzo/i, "Palazzo"],
  [/sharara/i, "Sharara"],
  [/salwar/i, "Salwar"],
  [/culotte/i, "Culotte"],
  [/pant|trouser/i, "Pant"],
];

export function buildHighlights(input: {
  name: string;
  category?: string | null;
  /** Resolved Fabric attribute label, or the free-text fabric field. */
  fabric?: string | null;
  /** Resolved Work attribute label, when set. */
  work?: string | null;
}): Highlight[] {
  const name = input.name ?? "";
  const out: Highlight[] = [];

  // 1. Craft — the attribute wins; the title is the fallback.
  const work = input.work?.trim();
  const craft =
    work && !PLAIN_WORK.test(work)
      ? work
      : CRAFTS.find(([re]) => re.test(name))?.[1];
  if (craft) out.push({ kind: "craft", label: craft });

  // 2. Fabric — "Pure" only when the title itself says pure.
  const fabric = input.fabric?.trim();
  if (fabric) {
    const chanderi = /chanderi/i.test(name);
    const pure = /\bpure\b/i.test(name) && !/pure\s+\w+\s+blend/i.test(name);
    const label = chanderi
      ? "Chanderi"
      : pure && !/^pure/i.test(fabric)
        ? `Pure ${fabric}`
        : fabric;
    out.push({ kind: "fabric", label });
  }

  // 3. What is in the set — the value signal. Kurta sets and suits only.
  if (/set|suit/i.test(`${input.category ?? ""} ${name}`)) {
    const bottom = BOTTOMS.find(([re]) => re.test(name))?.[1];
    const dupatta = /dupatta/i.test(name);
    const jacket = /jacket/i.test(name);
    const pieces = ["Kurta", bottom, dupatta ? "Dupatta" : jacket ? "Jacket" : null].filter(
      Boolean
    ) as string[];
    if (pieces.length >= 3) out.push({ kind: "set", label: `3-Piece: ${pieces.join(" + ")}` });
    else if (dupatta) out.push({ kind: "set", label: "With Dupatta" });
  }

  // 4. A genuine feature named in the title.
  if (/reversible/i.test(name)) out.push({ kind: "feature", label: "Reversible" });
  else if (/pocket/i.test(name)) out.push({ kind: "feature", label: "With Pockets" });

  return out.slice(0, 3);
}

/** The single strongest highlight for a product card badge. */
export function topHighlight(input: Parameters<typeof buildHighlights>[0]): Highlight | null {
  const all = buildHighlights(input);
  const craft = all.find((h) => h.kind === "craft");
  if (craft) return craft;
  // Cards are narrow: the full "3-Piece: Kurta + Pant + Dupatta" is for the PDP.
  const set = all.find((h) => h.kind === "set");
  if (set) return { kind: "set", label: set.label.startsWith("3-Piece") ? "3-Piece Set" : set.label };
  return null;
}
