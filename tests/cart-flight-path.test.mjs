import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cartFlightPosition } from '../lib/cart-flight-path.ts';

const path = { fromX: 120, fromY: 500, toX: 330, toY: 70, controlX: 350, controlY: 38 };

test('flight starts at the image and finishes at the target icon', () => {
  assert.deepEqual(cartFlightPosition(path, 0), { x: 120, y: 500, scale: 1 });
  const end = cartFlightPosition(path, 1);
  assert.equal(end.x, 330);
  assert.equal(end.y, 70);
  assert.ok(Math.abs(end.scale - 0.2) < 0.000001);
});

test('mid-flight and late failures can retrace the same path without a position jump', () => {
  for (const failureProgress of [0.1, 0.5, 0.9, 1]) {
    const departure = cartFlightPosition(path, failureProgress);
    const reversalStart = cartFlightPosition(path, failureProgress);
    assert.deepEqual(reversalStart, departure);
    assert.deepEqual(cartFlightPosition(path, 0), { x: 120, y: 500, scale: 1 });
  }
});

test('progress is bounded to prevent overshoot and invalid sizes', () => {
  assert.deepEqual(cartFlightPosition(path, -1), cartFlightPosition(path, 0));
  assert.deepEqual(cartFlightPosition(path, 2), cartFlightPosition(path, 1));
});
