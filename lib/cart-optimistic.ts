type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue => value && typeof value === 'object' ? value as RecordValue : {};
const rows = (value: unknown): RecordValue[] => Array.isArray(value) ? value.map(record) : [];
const identifier = (item: RecordValue) => String(item.id || item.publicId || item._id || '');
const total = (items: RecordValue[]) => items.reduce((sum, item) => sum + Number(item.totalPriceMinor ?? Number(item.unitPriceMinor || 0) * Number(item.quantity || 0)), 0);

/** Remove one line or clear the cart without mutating the rollback snapshot. */
export function optimisticCartRemoval(value: unknown, itemId?: string) {
  if (!value || typeof value !== 'object') return value;
  const cart = record(value);
  const groups = rows(cart.stateGroups);
  const allItems = Array.isArray(cart.items) ? rows(cart.items) : groups.flatMap((group) => rows(group.items));
  const keep = (item: RecordValue) => Boolean(itemId) && identifier(item) !== itemId;
  const items = allItems.filter(keep);
  const remainingIds = new Set(items.map(identifier));
  const stateGroups = groups.map((group) => {
    const groupItems = Array.isArray(group.items) ? rows(group.items).filter(keep)
      : items.filter((item) => Array.isArray(group.itemIds)
        ? group.itemIds.map(String).includes(identifier(item))
        : String(item.stateId || item.publicStateId || '') === String(group.publicStateId || group.stateId || group.id || ''));
    return { ...group, items: groupItems, itemIds: Array.isArray(group.itemIds) ? group.itemIds.filter((id) => remainingIds.has(String(id))) : undefined, subtotalMinor: total(groupItems) };
  }).filter((group) => group.items.length);
  return { ...cart, items, stateGroups, subtotalMinor: total(items), itemCount: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) };
}
