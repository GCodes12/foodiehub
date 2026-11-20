import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ALICE, render, SIGNED_OUT, text } from '../../test/render.tsx';
import { RequireAuth } from './RequireAuth.tsx';

const secret = <RequireAuth><p>checkout content</p></RequireAuth>;

describe('RequireAuth (protected routes)', () => {
  it('shows the page to a signed-in customer', () => {
    assert.match(render(secret, { auth: ALICE }), /checkout content/);
  });

  it('asks a signed-out visitor to log in, without showing the page', () => {
    const page = text(render(secret, { auth: SIGNED_OUT }));
    assert.doesNotMatch(page, /checkout content/);
    assert.match(page, /Please log in/);
    assert.match(page, /Login/);
  });

  it('explains an expired session', () => {
    assert.match(text(render(secret, { auth: { ...SIGNED_OUT, sessionExpired: true } })), /Your session has ended/);
  });

  it('explains when sign-in itself is unavailable', () => {
    const page = text(render(secret, { auth: { ...SIGNED_OUT, available: false } }));
    assert.match(page, /Sign-in is unavailable/);
    assert.doesNotMatch(page, /checkout content/);
  });
});
