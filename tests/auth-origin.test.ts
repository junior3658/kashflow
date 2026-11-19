import assert from 'node:assert/strict';
import { isSameOriginWrite } from '../src/backend/auth/origin';

export function testAuthOriginGuard() {
  console.log('--- RUNNING AUTH ORIGIN GUARD TESTS ---');
  const appUrl = 'https://kashflow.example/app';
  assert.equal(isSameOriginWrite('https://kashflow.example', appUrl), true);
  assert.equal(isSameOriginWrite('https://kashflow.example:443', appUrl), false);
  assert.equal(isSameOriginWrite('https://evil.example', appUrl), false);
  assert.equal(isSameOriginWrite('http://kashflow.example', appUrl), false);
  assert.equal(isSameOriginWrite(undefined, appUrl), false);
  assert.equal(isSameOriginWrite('null', appUrl), false);
  assert.equal(isSameOriginWrite('https://kashflow.example/', appUrl), false);
  assert.equal(isSameOriginWrite('https://kashflow.example/path', appUrl), false);
  assert.equal(isSameOriginWrite('not-an-origin', appUrl), false);
  assert.equal(isSameOriginWrite('https://kashflow.example', 'invalid-app-url'), false);
  console.log('✓ Mutating requests require an exact, valid configured origin.');
}
