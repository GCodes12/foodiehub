import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AdminOnly } from '../../App.tsx';
import { ADMIN, ALICE, OWNER, render, text } from '../../test/render.tsx';
import type { AdminRestaurantSummary, OwnerAccount } from '../../types/api.ts';
import { OwnerManagement } from './AdminDashboardPage.tsx';
import { CreatedOwnerPanel, OwnerTable } from './AdminOwnersPage.tsx';

const OWNERS: OwnerAccount[] = [
  { sub: 's1', username: 'owner', displayName: 'Owner Demo', email: 'owner@foodiehub.local', enabled: true, passwordChangePending: false,
    restaurants: [{ id: 'z', name: 'ZAYORA', active: true }] },
  { sub: 's2', username: 'asha.rao', displayName: 'Asha Rao', email: 'asha@example.com', enabled: true, passwordChangePending: true, restaurants: [] },
  { sub: 's3', username: 'old.owner', displayName: null, email: null, enabled: false, passwordChangePending: false, restaurants: [] },
];
const RESTAURANT: AdminRestaurantSummary = {
  id: 'r1', name: 'Spice Route', city: 'Kochi', active: true, owner: null, dishes: 3, availableDishes: 2, updatedAt: '',
};
const page = { items: OWNERS, page: 0, size: 5, totalItems: 3, totalPages: 1 };
const noop = () => {};

describe('owner management (DEC-018)', () => {
  it('lists owners with name, username, email, restaurant and account status', () => {
    const html = text(render(<OwnerTable owners={OWNERS} />));
    assert.match(html, /Owner Demo owner owner@foodiehub\.local ZAYORA Active/);
    assert.match(html, /Asha Rao asha\.rao asha@example\.com Not assigned Must change password/);
    assert.match(html, /— old\.owner — Not assigned Disabled/);
  });

  it('has an empty state', () => {
    assert.match(text(render(<OwnerTable owners={[]} />)), /No owner accounts yet/);
  });

  it('shows owner management on the dashboard with a Create Owner button', () => {
    const html = render(<OwnerManagement owners={{ data: page, error: null }} canCreate />);
    assert.match(text(html), /Owner management Manage owners Create owner/);
    assert.match(text(html), /Asha Rao asha@example\.com Not assigned Must change password/);
    assert.match(text(html), /3 owner accounts in total/);
    assert.match(html, /href="\/admin\/owners\/new"/);
  });

  it('hides Create Owner and explains why when the server cannot create owners', () => {
    const html = render(<OwnerManagement owners={{ data: page, error: null }} canCreate={false} />);
    assert.doesNotMatch(html, /href="\/admin\/owners\/new"/);
    assert.match(text(html), /Owner creation isn't set up on the server/);
  });

  it('shows the error state', () => {
    const html = text(render(<OwnerManagement owners={{ data: null, error: new Error('x') }} canCreate />));
    assert.match(html, /Something went wrong/);
  });

  it('confirms a created owner without ever showing the password, and the assignment', () => {
    const html = text(render(<CreatedOwnerPanel owner={OWNERS[1]} restaurant={RESTAURANT} assignError={null} onCreateAnother={noop} />));
    assert.match(html, /asha\.rao created/);
    assert.match(html, /Asha Rao \(asha@example\.com\) can now log in as a restaurant owner/);
    assert.match(html, /Assigned to Spice Route/);
    assert.match(html, /must replace it at first login/);
    assert.doesNotMatch(html, /password:/i);
  });

  it('says when no restaurant was chosen (assign later)', () => {
    assert.match(text(render(<CreatedOwnerPanel owner={OWNERS[1]} restaurant={null} assignError={null} onCreateAnother={noop} />)),
      /No restaurant assigned yet/);
  });

  it('keeps the created account and offers a retry when the assignment failed', () => {
    const html = render(<CreatedOwnerPanel owner={OWNERS[1]} restaurant={RESTAURANT} assignError={new Error('x')}
      onRetryAssign={noop} onCreateAnother={noop} />);
    assert.match(text(html), /The account was created, but assigning Spice Route failed/);
    assert.match(text(html), /Try the assignment again/);
    assert.doesNotMatch(text(html), /Assigned to Spice Route/);
  });

  it('keeps owner pages admin-only', () => {
    const owners = <AdminOnly><OwnerTable owners={OWNERS} /></AdminOnly>;
    assert.match(text(render(owners, { auth: ADMIN })), /asha@example\.com/);
    for (const auth of [OWNER, ALICE]) {
      const html = text(render(owners, { auth }));
      assert.doesNotMatch(html, /asha@example\.com/);
      assert.match(html, /For platform administrators/);
    }
  });
});
