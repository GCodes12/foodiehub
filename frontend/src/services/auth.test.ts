import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hasRole } from '../context/AuthContext.tsx';
import { rolesFromClaims } from './auth.ts';

describe('roles from the Keycloak token', () => {
  it('reads realm_access.roles and ignores anything malformed', () => {
    assert.deepEqual(rolesFromClaims({ realm_access: { roles: ['CUSTOMER', 'offline_access'] } }), ['CUSTOMER', 'offline_access']);
    assert.deepEqual(rolesFromClaims({ realm_access: { roles: 'CUSTOMER' } }), []);
    assert.deepEqual(rolesFromClaims({ realm_access: { roles: ['OK', 42] } }), ['OK']);
    assert.deepEqual(rolesFromClaims(undefined), []);
  });

  it('only a signed-in user has roles', () => {
    assert.equal(hasRole({ signedIn: true, roles: ['RESTAURANT_OWNER'] }, 'RESTAURANT_OWNER'), true);
    assert.equal(hasRole({ signedIn: true, roles: ['CUSTOMER'] }, 'RESTAURANT_OWNER'), false);
    assert.equal(hasRole({ signedIn: false, roles: ['RESTAURANT_OWNER'] }, 'RESTAURANT_OWNER'), false);
  });
});
