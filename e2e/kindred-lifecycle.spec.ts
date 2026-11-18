import { expect, test } from '@playwright/test';

test.describe('KindredAI End-to-End 4-Stage Studio Journey (Chromium)', () => {
  test('completes Wingman onboarding, Agent Lounge interview, Cohort accept, Co-Op game + Human Chat, and Dual-Consent Future Studio', async ({
    page,
  }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // Reset demo state cleanly before journey
    await page.request.post('/api/profiles', {
      data: { action: 'reset_demo' },
    });

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'KindredAI' })).toBeVisible();

    // Verify Warm Nocturne -> Editorial Alabaster theme switcher works cleanly
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'nocturne');
    await page.getByTestId('theme-toggle-button').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'alabaster');
    await page.getByTestId('theme-toggle-button').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'nocturne');

    // Stage 1: Send a reflection to Wingman and verify Blueprint sidebar updates
    await page.getByTestId('wingman-input').fill(
      'I love unhurried Sunday farmer markets, calm same-night repair, and dry playful banter.',
    );
    await page.getByTestId('wingman-send-button').click();
    await expect(page.getByTestId('wingman-messages')).toContainText('100%');

    // Stage 2: Enter Agent Lounge, run interview with Marcus Hale (seed-1), and accept
    await page.getByTestId('stage-tab-discovery').click();
    await page.getByTestId('candidate-card-seed-1').click();
    await page.getByTestId('run-agent-interview-button').click();

    await expect(page.getByTestId('agent-lounge-transcript')).toContainText('Turn 6');
    await expect(page.getByTestId('match-dossier-card')).toContainText('Overall Alignment');

    await page.getByTestId('accept-match-button').click();
    await expect(page.getByTestId('focused-cohort-trigger')).toContainText('(1/3)');

    // Stage 3: Launch Co-Op Game Arena -> Blind World-Trip Draft + Authentic Human Chat
    await page.getByTestId('enter-coop-arena-button').click();
    await page.getByTestId('start-coop-game-button').click();
    await page.getByTestId('blind-trip-wildcard-input').fill('Morning ceramic studio coffee');
    await page.getByTestId('submit-blind-trip-button').click();
    await expect(page.getByTestId('dream-itinerary-reveal')).toContainText('Dream Itinerary Revealed');

    await page.getByTestId('human-chat-input').fill('Excited to grab espresso this Sunday!');
    await page.getByTestId('human-chat-send').click();
    await expect(page.getByTestId('human-chat-messages')).toContainText(
      'Excited to grab espresso this Sunday!',
    );

    // Stage 4: Unlock Future Sandbox, opt into Future Family Visualizer, and verify SVG Portrait Composer
    await page.getByTestId('stage-tab-future').click();
    await page.getByTestId('unlock-future-sandbox-button').click();
    await page.getByRole('switch', { name: 'Opt in to Future Family Visualizer' }).click();
    await page.getByTestId('generate-all-future-button').click();

    await expect(page.getByText('First Date')).toBeVisible();
    await page.getByRole('button', { name: /Around-the-World Adventure/i }).click();
    await expect(page.getByText(/Kyoto/i).first()).toBeVisible();

    await page.getByRole('button', { name: /Future Family Visualizer/i }).click();
    await expect(page.getByTestId('family-portrait-svg-composer')).toBeVisible();

    expect(pageErrors).toEqual([]);
  });

  test('renders cleanly across 390px mobile and 1440px desktop viewports without horizontal overflow', async ({
    page,
  }) => {
    await page.request.post('/api/profiles', {
      data: { action: 'reset_demo' },
    });

    for (const vp of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(vp);
      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'KindredAI' })).toBeVisible();

      for (const tab of ['onboarding', 'discovery', 'games', 'future'] as const) {
        await page.getByTestId(`stage-tab-${tab}`).click();
        await page.waitForTimeout(150);
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
        );
        expect(overflow, `Unexpected horizontal overflow on ${vp.width}px at stage ${tab}`).toBe(
          false,
        );
      }
    }
  });
});
