/**
 * Variant selection for a product page, driven by what the product's
 * category asks for (size and colour for shoes, capacity and colour for a
 * powerbank, length and texture for a wig). Pure functions, so the same logic
 * runs in the Partner portal and, as a copy, in the customer app.
 */
export type AxisType = "size" | "colour" | "select" | "text";

export interface VariantLike {
  publicId?: string;
  size?: string;
  colour?: string;
  attributes?: Record<string, string>;
}

export interface AttributeLike {
  key: string;
  label: string;
  type: AxisType;
  variantAxis?: boolean;
  options?: string[];
}

export interface Axis {
  key: string;
  label: string;
  type: AxisType;
  values: string[];
}

export type Selection = Record<string, string>;

const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** The value a variant has for an axis. Colour is read from `colour` or a legacy `color` attribute. */
export function valueOf(variant: VariantLike, key: string): string {
  if (key === "size") return variant.size || "";
  if (key === "colour" || key === "color") return variant.colour || variant.attributes?.colour || variant.attributes?.color || "";
  return variant.attributes?.[key] || "";
}

const humanise = (key: string) => key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

/**
 * The choices to show, in the category's order. Only axes that actually have
 * a value on some variant appear, so a product with no size shows no size row.
 * Without category attributes (older products), size and colour are used.
 */
export function buildAxes(variants: VariantLike[], attributes?: AttributeLike[]): Axis[] {
  const declared = (attributes || []).filter((attribute) => attribute.variantAxis !== false);
  const keys = declared.length
    ? declared.map((attribute) => ({ key: attribute.key === "color" ? "colour" : attribute.key, label: attribute.label, type: attribute.type, options: attribute.options }))
    : [
        { key: "size", label: "Size", type: "size" as AxisType, options: undefined },
        { key: "colour", label: "Colour", type: "colour" as AxisType, options: undefined },
      ];
  // Details a variant carries that the category does not list still get a row.
  const known = new Set(keys.map((entry) => entry.key));
  for (const variant of variants) {
    for (const key of Object.keys(variant.attributes || {})) {
      if (!known.has(key) && !["color", "colour"].includes(key)) {
        known.add(key);
        keys.push({ key, label: humanise(key), type: "select", options: undefined });
      }
    }
  }
  const axes: Axis[] = [];
  for (const entry of keys) {
    const seen = new Map<string, string>();
    for (const variant of variants) {
      const value = valueOf(variant, entry.key).trim();
      if (value && !seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value);
    }
    if (!seen.size) continue;
    let values = [...seen.values()];
    // Follow the category's own order when it lists options.
    if (entry.options?.length) {
      const order = entry.options.map((option) => option.toLowerCase());
      values = values.sort((a, b) => (order.indexOf(a.toLowerCase()) + 1 || 999) - (order.indexOf(b.toLowerCase()) + 1 || 999));
    }
    axes.push({ key: entry.key, label: entry.label, type: entry.type, values });
  }
  return axes;
}

/** The variant that matches every chosen value, or undefined. */
export function findVariant<T extends VariantLike>(variants: T[], selection: Selection): T | undefined {
  const chosen = Object.entries(selection).filter(([, value]) => value);
  if (!chosen.length) return undefined;
  return variants.find((variant) => chosen.every(([key, value]) => same(valueOf(variant, key), value)));
}

/** Values on `axisKey` that exist together with everything else already chosen. */
export function availableValues(variants: VariantLike[], selection: Selection, axisKey: string): Set<string> {
  const others = Object.entries(selection).filter(([key, value]) => key !== axisKey && value);
  const result = new Set<string>();
  for (const variant of variants) {
    if (others.every(([key, value]) => same(valueOf(variant, key), value))) {
      const value = valueOf(variant, axisKey).trim();
      if (value) result.add(value.toLowerCase());
    }
  }
  return result;
}

/** Axes with only one possible value are chosen for the customer. */
export function autoSelection(axes: Axis[], current: Selection = {}): Selection {
  const next = { ...current };
  for (const axis of axes) if (!next[axis.key] && axis.values.length === 1) next[axis.key] = axis.values[0];
  return next;
}

/** Choose a value; anything that no longer fits with it is cleared. */
export function choose(variants: VariantLike[], axes: Axis[], selection: Selection, axisKey: string, value: string): Selection {
  let next: Selection = { ...selection, [axisKey]: value };
  for (const axis of axes) {
    if (axis.key === axisKey || !next[axis.key]) continue;
    if (!availableValues(variants, next, axis.key).has(next[axis.key].toLowerCase())) delete next[axis.key];
  }
  next = autoSelection(axes, next);
  return next;
}

/** The first axis still to be chosen, or undefined when the selection is complete. */
export function nextMissingAxis(axes: Axis[], selection: Selection): Axis | undefined {
  return axes.find((axis) => !selection[axis.key]);
}

/** What a cart line's chosen details look like: colour, size and anything else the category asks for. */
export type SelectedVariants = Record<string, string | undefined>;

/**
 * Stable text for a set of chosen details, used to tell cart lines apart.
 * Colour and size keep the historical `colour::size` shape so existing lines
 * still match; other details are appended in a fixed order.
 */
export function variantSignature(selected?: SelectedVariants): string {
  const entries = Object.entries(selected || {})
    .map(([key, value]) => [key === "colour" ? "color" : key, String(value ?? "").trim().toLowerCase()] as const)
    .filter(([, value]) => value);
  const lookup = Object.fromEntries(entries);
  const base = `${lookup.color || "-"}::${lookup.size || "-"}`;
  const others = entries.filter(([key]) => key !== "color" && key !== "size").sort(([a], [b]) => a.localeCompare(b));
  return others.length ? `${base}::${others.map(([key, value]) => `${key}=${value}`).join("|")}` : base;
}

/** The chosen details of a variant, in the shape a cart line stores. */
export function variantDetails(variant: VariantLike): SelectedVariants {
  const details: SelectedVariants = {};
  const colour = valueOf(variant, "colour");
  if (colour) details.color = colour;
  if (variant.size) details.size = variant.size;
  for (const [key, value] of Object.entries(variant.attributes || {})) {
    if (value && key !== "color" && key !== "colour" && !(key in details)) details[key] = value;
  }
  return details;
}
