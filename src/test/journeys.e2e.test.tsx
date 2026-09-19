/**
 * End-to-end user journeys, driven through the real page components against a
 * running Worker and D1 database.
 *
 * These are not mocked. `renderWithProviders` mounts the same provider stack
 * `App.tsx` uses, every context calls the live API through `src/lib/api.ts`,
 * and assertions are made against data that was written to the database. A
 * mutation performed through the UI is then re-read from the API to prove it
 * actually persisted.
 *
 * The suite creates a small pool of members once and reuses them, because the
 * platform's own registration rate limit (10 per hour per IP) is real and
 * should not be weakened to make tests convenient.
 *
 * If the backend is not running the whole suite is skipped — it never passes
 * against nothing.
 *
 *   node worker/scripts/seed.mjs --reset     # clean, known database
 *   cd worker && npx wrangler dev --port 8787
 *   npm run dev
 *   npx vitest run src/test/journeys.e2e.test.tsx
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PrayerPage } from '@/pages/PrayerPage';
import { TestimoniesPage } from '@/pages/TestimoniesPage';
import { LandingPage } from '@/pages/LandingPage';
import { renderWithProviders } from './render-app';
import {
  installLiveFetch,
  isApiUp,
  login,
  registerAndLogin,
  freshPhone,
  apiCall,
  apiCallRaw,
  LEADER,
} from './live-api';

const apiUp = await isApiUp();
const describeLive = apiUp ? describe : describe.skip;

if (!apiUp) {
  // Loud, so a skipped suite is never mistaken for a passing one.
  console.warn(
    '\n[journeys.e2e] SKIPPED: no API at TEST_API_BASE. Start the Worker and the dev server to run these.\n',
  );
}

/**
 * Members created once for the whole file and reused across tests. Six
 * registrations keeps the suite comfortably inside the real 10-per-hour limit
 * even if it is run twice in an hour.
 */
const POOL: Record<string, { name: string; phone: string; password: string }> = {
  author: { name: 'E2E Author', phone: '', password: 'e2e-test-password' },
  other: { name: 'E2E Other', phone: '', password: 'e2e-test-password' },
  bystander: { name: 'E2E Bystander', phone: '', password: 'e2e-test-password' },
  outsider: { name: 'E2E Outsider', phone: '', password: 'e2e-test-password' },
  composer: { name: 'E2E Composer', phone: '', password: 'e2e-test-password' },
};

beforeAll(async () => {
  installLiveFetch();
  if (!apiUp) return;
  for (const key of Object.keys(POOL)) {
    POOL[key].phone = freshPhone();
    await registerAndLogin(POOL[key]);
  }
});

const signInAs = (key: keyof typeof POOL) => login(POOL[key]);

// ---------------------------------------------------------------------------
// The public landing page — what a stranger sees first.
// ---------------------------------------------------------------------------
describeLive('Public cell page', () => {
  it('renders the real cell name, leader and member count from the database', async () => {
    const cell = await apiCall<{ name: string; leaderName: string | null; memberCount: number }>(
      '/api/public/cell/HC1',
    );

    renderWithProviders(<LandingPage />, { route: '/cell/HC1' });

    expect(await screen.findByText(cell.name)).toBeInTheDocument();
    if (cell.leaderName) {
      expect(await screen.findByText(new RegExp(cell.leaderName))).toBeInTheDocument();
    }
    expect(
      await screen.findByText(new RegExp(`${cell.memberCount}\\s+members?`)),
    ).toBeInTheDocument();
  });

  it('publishes the meeting link only when the leader has opened public joining', async () => {
    await login(LEADER);
    await apiCall('/api/hierarchy/homecell/hc1/meeting', {
      method: 'PATCH',
      body: { publicJoinEnabled: false, meetingLink: 'https://meet.google.com/abc-defg-hij' },
    });

    const closed = renderWithProviders(<LandingPage />, { route: '/cell/HC1' });
    await screen.findByText('Grace Life Online Cell');
    expect(screen.queryByRole('link', { name: /open the meeting/i })).not.toBeInTheDocument();
    closed.unmount();

    await apiCall('/api/hierarchy/homecell/hc1/meeting', {
      method: 'PATCH',
      body: { publicJoinEnabled: true },
    });

    renderWithProviders(<LandingPage />, { route: '/cell/HC1' });
    const joinLink = await screen.findByRole('link', { name: /open the meeting/i });
    expect(joinLink).toHaveAttribute('href', expect.stringMatching(/^https:\/\//));

    // Leave the cell in the state the demo expects.
    await apiCall('/api/hierarchy/homecell/hc1/meeting', {
      method: 'PATCH',
      body: { publicJoinEnabled: false },
    });
  });

  it('never exposes the meeting link to an anonymous visitor when joining is closed', async () => {
    await login(LEADER);
    await apiCall('/api/hierarchy/homecell/hc1/meeting', {
      method: 'PATCH',
      body: { publicJoinEnabled: false, meetingLink: 'https://meet.google.com/secret-url' },
    });

    const body = await apiCall<{
      publicJoinOpen: boolean;
      meetingLink: string | null;
      meetingPasscode: string | null;
    }>('/api/public/cell/HC1');

    expect(body.publicJoinOpen).toBe(false);
    expect(body.meetingLink).toBeNull();
    expect(body.meetingPasscode).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Prayer — privacy is the whole point of this feature.
// ---------------------------------------------------------------------------
describeLive('Prayer requests', () => {
  it('a leader sees a request submitted by a member, with the author named', async () => {
    const title = `E2E prayer ${Date.now()}`;

    await signInAs('author');
    await apiCall('/api/prayer', {
      method: 'POST',
      body: { title, body: 'Please pray for this end-to-end test.', visibility: 'cell' },
    });

    await login(LEADER);
    renderWithProviders(<PrayerPage />, { route: '/prayer' });

    expect(await screen.findByText(title, {}, { timeout: 8000 })).toBeInTheDocument();
  });

  it('a private request is never returned to another member', async () => {
    const secret = `E2E private ${Date.now()}`;

    await signInAs('author');
    await apiCall('/api/prayer', {
      method: 'POST',
      body: { title: secret, body: 'This must stay private.', visibility: 'private' },
    });

    await signInAs('other');
    renderWithProviders(<PrayerPage />, { route: '/prayer' });

    // Wait for the page to settle, then assert absence.
    await screen.findByRole('heading', { name: /prayer/i });
    await waitFor(() => expect(screen.queryByText(/loading/i)).not.toBeInTheDocument(), {
      timeout: 8000,
    });
    expect(screen.queryByText(secret)).not.toBeInTheDocument();

    // And the API itself refuses to return it to this member.
    const list = await apiCall<{ prayerRequests: Array<{ title: string }> }>('/api/prayer');
    expect(list.prayerRequests.some((r) => r.title === secret)).toBe(false);
  });

  it('submits a request through the composer and persists it to the database', async () => {
    const user = userEvent.setup();
    const title = `E2E composed ${Date.now()}`;

    await signInAs('composer');
    renderWithProviders(<PrayerPage />, { route: '/prayer' });

    // Use the exact labels the page renders, so the test fails loudly if the
    // wording changes rather than silently matching something else.
    const composeButton = await screen.findByRole('button', { name: /^share$|^request$/i });
    await user.click(composeButton);

    await user.type(await screen.findByLabelText(/^title/i), title);
    await user.type(
      await screen.findByLabelText(/what would you like prayer for/i),
      'Written by the end-to-end test.',
    );

    await user.click(screen.getByRole('button', { name: /send request/i }));

    // Prove it reached the database, not just the DOM.
    await waitFor(
      async () => {
        const data = await apiCall<{ prayerRequests: Array<{ title: string }> }>(
          '/api/prayer',
        );
        expect(data.prayerRequests.some((r) => r.title === title)).toBe(true);
      },
      { timeout: 8000 },
    );
  });
});

// ---------------------------------------------------------------------------
// Testimonies — moderation must be enforced, not decorative.
// ---------------------------------------------------------------------------
describeLive('Testimonies', () => {
  it('stays hidden from other members until a leader approves it', async () => {
    const title = `E2E testimony ${Date.now()}`;

    await signInAs('author');
    const created = await apiCall<{ id: string }>('/api/testimonies', {
      method: 'POST',
      body: { title, body: 'God did something worth recording here.', visibility: 'cell' },
    });

    // Another member sees nothing yet — checked in the DOM, not just the API.
    await signInAs('bystander');
    renderWithProviders(<TestimoniesPage />, { route: '/testimonies' });
    await screen.findByRole('heading', { name: /testimonies/i });
    await waitFor(() => expect(screen.queryByText(title)).not.toBeInTheDocument(), {
      timeout: 5000,
    });

    await login(LEADER);
    await apiCall(`/api/testimonies/${created.id}/review`, {
      method: 'PATCH',
      body: { decision: 'approved' },
    });

    // Only now is it visible to the cell.
    await signInAs('other');
    renderWithProviders(<TestimoniesPage />, { route: '/testimonies' });
    expect(await screen.findByText(title, {}, { timeout: 8000 })).toBeInTheDocument();
  });

  it('refuses a public testimony submitted without consent, rather than silently making it private', async () => {
    await signInAs('author');

    const raw = await apiCallRaw('/api/testimonies', {
      method: 'POST',
      body: {
        title: 'Public without consent',
        body: 'This should be rejected outright.',
        visibility: 'public',
        consentToSharePublicly: false,
      },
    });

    expect(raw.success).toBe(false);
    expect(raw.status).toBe(400);

    // And nothing was written.
    const mine = await apiCall<{ testimonies: Array<{ title: string }> }>('/api/testimonies');
    expect(mine.testimonies.some((t) => t.title === 'Public without consent')).toBe(false);
  });

  it('accepts a public testimony once consent is given', async () => {
    await signInAs('author');
    const title = `E2E consented ${Date.now()}`;

    const created = await apiCall<{ id: string; status: string }>('/api/testimonies', {
      method: 'POST',
      body: {
        title,
        body: 'Happy to share this openly.',
        visibility: 'public',
        consentToSharePublicly: true,
      },
    });

    // Recorded with consent, but nothing is published until a leader approves.
    expect(created.status).toBe('pending');
    const cell = await apiCall<{ testimonies: Array<{ title: string; sharedPublicly?: boolean }> }>(
      '/api/testimonies',
    );
    const mine = cell.testimonies.find((t) => t.title === title);
    // The author can see their own pending row, and it is not yet public.
    expect(mine).toBeDefined();
    expect(mine!.sharedPublicly).toBe(false);

    // Another member cannot see it at all.
    await signInAs('bystander');
    const others = await apiCall<{ testimonies: Array<{ title: string }> }>('/api/testimonies');
    expect(others.testimonies.some((t) => t.title === title)).toBe(false);

    // Once a leader approves, consent is honoured and it becomes public.
    await login(LEADER);
    await apiCall(`/api/testimonies/${created.id}/review`, {
      method: 'PATCH',
      body: { decision: 'approved' },
    });
    await signInAs('author');
    const approved = await apiCall<{ testimonies: Array<{ id: string; sharedPublicly: boolean }> }>(
      '/api/testimonies',
    );
    expect(approved.testimonies.find((t) => t.id === created.id)?.sharedPublicly).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Authorisation matrix — a plain member must not reach leader-only actions.
// ---------------------------------------------------------------------------
describeLive('Permission boundaries', () => {
  it('a member cannot change the cell meeting settings', async () => {
    await signInAs('outsider');

    const raw = await apiCallRaw('/api/hierarchy/homecell/hc1/meeting', {
      method: 'PATCH',
      body: { publicJoinEnabled: true },
    });

    expect(raw.success).toBe(false);
    expect([401, 403]).toContain(raw.status);
  });

  it('a member cannot issue an invitation', async () => {
    await signInAs('outsider');

    const raw = await apiCallRaw('/api/invitations', { method: 'POST', body: { role: 'member' } });
    expect(raw.success).toBe(false);
    expect([401, 403]).toContain(raw.status);
  });

  it('a member cannot approve their own testimony', async () => {
    await signInAs('author');

    // Create one specifically for this test, so it does not depend on what
    // earlier tests happened to leave behind.
    const own = await apiCall<{ id: string }>('/api/testimonies', {
      method: 'POST',
      body: {
        title: `E2E self-approval ${Date.now()}`,
        body: 'A member must not be able to publish this themselves.',
        visibility: 'cell',
      },
    });

    const raw = await apiCallRaw(`/api/testimonies/${own.id}/review`, {
      method: 'PATCH',
      body: { decision: 'approved' },
    });

    expect(raw.success).toBe(false);
    expect([401, 403]).toContain(raw.status);

    // And it is still pending in the database.
    const mine = await apiCall<{ testimonies: Array<{ id: string; status: string }> }>(
      '/api/testimonies',
    );
    expect(mine.testimonies.find((t) => t.id === own.id)?.status).toBe('pending');
  });

  it('a member cannot read another cell through the overview endpoint', async () => {
    await signInAs('outsider');

    const raw = await apiCallRaw('/api/hierarchy/overview');
    if (raw.success) {
      // Scoped down rather than refused — either is acceptable, but a success
      // must not include a cell this member does not belong to.
      const data = await apiCall<{ homecells: { cells: Array<{ id: string }> } }>(
        '/api/hierarchy/overview',
      );
      expect(data.homecells.cells.every((c) => c.id === 'hc1')).toBe(true);
    } else {
      expect([401, 403]).toContain(raw.status);
    }
  });

  it('an unauthenticated caller cannot read member or prayer data', async () => {
    // No session at all.
    const previous = (globalThis as { __savedCookie?: string }).__savedCookie;
    void previous;

    const { clearSession } = await import('./live-api');
    clearSession();

    for (const path of ['/api/members', '/api/prayer', '/api/attendance', '/api/reports']) {
      const raw = await apiCallRaw(path);
      expect(raw.success, `${path} should require a session`).toBe(false);
      expect(raw.status).toBe(401);
    }
  });
});
