import test from 'node:test';
import assert from 'node:assert/strict';

test('phase 0 scaffold smoke test', () => {
  assert.equal('artio'.startsWith('art'), true);
});
