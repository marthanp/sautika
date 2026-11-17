import { expect, test, type ConsoleMessage } from '@playwright/test';

/**
 * Noise we do not control: Clerk's development warning, and the browser
 * complaining about third-party cookies or a missing favicon variant.
 */
const IGNORED_CONSOLE = [
  /clerk.*development/i,
  /third-party cookie/i,
  /favicon/i,
  /Download the React DevTools/i,
];

function collectErrors(messages: ConsoleMessage[]): string[] {
  return messages
    .filter((message) => message.type() === 'error')
    .map((message) => message.text())
    .filter((text) => !IGNORED_CONSOLE.some((pattern) => pattern.test(text)));
}

test('the landing page renders without console errors', async ({ page }) => {
  const messages: ConsoleMessage[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => messages.push(message));
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await page.goto('/', { waitUntil: 'domcontentloaded' });

  // The hero headline is the one thing every visitor must see.
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.locator('main')).toBeVisible();

  expect(pageErrors, 'uncaught page errors').toEqual([]);
  expect(collectErrors(messages), 'console errors').toEqual([]);
});

test('the sign-in page renders a usable form', async ({ page }) => {
  await page.goto('/sign-in', { waitUntil: 'domcontentloaded' });

  // Any heading level: the card uses an h2 today.
  await expect(page.getByRole('heading').first()).toBeVisible();
  // Email and password, whatever Clerk calls them in this build.
  await expect(page.locator('input[type="email"], input[name="identifier"]').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /sign in|continue/i }).first()).toBeVisible();
});

test('a signed-out visitor is sent to sign-in, not into a notebook', async ({ page }) => {
  await page.goto('/notebook', { waitUntil: 'domcontentloaded' });
  // Clerk owns the redirect; what matters is that the workspace never renders.
  await expect(page).toHaveURL(/sign-in|sign-up|accounts\./);
});

test('the notebook API refuses a signed-out caller', async ({ request }) => {
  for (const path of ['/api/notebooks', '/api/sources?notebookId=whatever']) {
    const response = await request.get(path);
    expect(response.status(), path).toBe(401);
  }
});

test('the landing page has no horizontal scroll on a phone', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  // A pixel or two of rounding is fine; a sideways-scrolling page is not.
  expect(overflow).toBeLessThanOrEqual(2);
});

/**
 * Phase 10's phone check. The project already runs every test on a Pixel-sized
 * viewport; this pins the narrowest width we claim to support and the
 * reduced-motion preference.
 */
test.describe('on a 360px phone', () => {
  test.use({ viewport: { width: 360, height: 760 } });

  // Reduced motion is emulated per page rather than as a `use` option, which
  // this Playwright version does not accept there.
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });

  test('the landing page fits without sideways scrolling', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, 'horizontal overflow in px').toBeLessThanOrEqual(2);
  });

  test('the new sections render and the About link has somewhere to go', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Added in Phase 9: the About link used to point at nothing.
    await expect(page.locator('#about')).toBeAttached();
    await expect(page.locator('#notebook')).toBeAttached();
  });

  test('the password reset page works without a session', async ({ page }) => {
    await page.goto('/forgot-password', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send me a code/i })).toBeVisible();
  });
});
