import assert from 'node:assert/strict';
import { test } from 'node:test';
import { optimisticCartRemoval } from '../lib/cart-optimistic.ts';

const a = { publicId: 'a', quantity: 2, unitPriceMinor: 1000, stateId: 'lagos' };
const b = { id: 'b', quantity: 1, totalPriceMinor: 3000, stateId: 'abuja' };
const cart = { items: [a, b], subtotalMinor: 5000, itemCount: 3,
  stateGroups: [{ stateId: 'lagos', items: [a] }, { stateId: 'abuja', items: [b] }] };

test('removal updates counts, totals and groups without changing the rollback snapshot', () => {
  const before = structuredClone(cart);
  const next = optimisticCartRemoval(cart, 'a');
  assert.deepEqual(next.items, [b]);
  assert.equal(next.itemCount, 1);
  assert.equal(next.subtotalMinor, 3000);
  assert.equal(next.stateGroups.length, 1);
  assert.deepEqual(cart, before);
});

test('clear all instantly empties the cart and preserves the previous snapshot', () => {
  const next = optimisticCartRemoval(cart);
  assert.deepEqual(next.items, []);
  assert.deepEqual(next.stateGroups, []);
  assert.equal(next.itemCount, 0);
  assert.equal(next.subtotalMinor, 0);
  assert.equal(cart.items.length, 2);
});

test('legacy state groups and ID-only groups retain the correct remaining items', () => {
  for (const stateGroups of [[{ stateId: 'lagos' }, { stateId: 'abuja' }], [{ itemIds: ['a'] }, { itemIds: ['b'] }]]) {
    const next = optimisticCartRemoval({ ...cart, stateGroups }, 'a');
    assert.equal(next.stateGroups.length, 1);
    assert.deepEqual(next.stateGroups[0].items, [b]);
  }
});

test('a grouped-only cart and a missing cache are safe to process', () => {
  assert.equal(optimisticCartRemoval(undefined), undefined);
  const next = optimisticCartRemoval({ stateGroups: cart.stateGroups }, 'a');
  assert.deepEqual(next.items, [b]);
});
