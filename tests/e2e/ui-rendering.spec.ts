/**
 * UI Rendering — end-to-end tests using the web-based test harness.
 * @tags @ui
 */
import { test, expect } from '@playwright/test';
import path from 'path';

const SCREENSHOT_DIR = path.resolve(__dirname, '../../test-screenshots/ui-rendering');

test.describe('UI Rendering @ui', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should render chat screen layout', async ({ page }) => {
    await test.step('verify chat screen elements', async () => {
      const chatScreen = page.locator('[data-testid="chat-screen"]');
      await expect(chatScreen).toBeVisible();

      const aiMessages = page.locator('[data-testid="ai-message"]');
      await expect(aiMessages).toBeVisible();

      const userMessages = page.locator('[data-testid="user-message"]');
      await expect(userMessages).toBeVisible();

      const chatInput = page.locator('[data-testid="chat-input"]');
      await expect(chatInput).toBeVisible();

      const sendButton = page.locator('[data-testid="send-button"]');
      await expect(sendButton).toBeVisible();
    });

    await test.step('verify header', async () => {
      const header = page.locator('[data-testid="header"]');
      await expect(header).toBeVisible();
      await expect(header).toContainText('MyPal');
    });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'chat-screen.png'), fullPage: true });
  });

  test('should render brain visualization', async ({ page }) => {
    await test.step('navigate to brain tab', async () => {
      await page.locator('[data-testid="nav-brain"]').click();
    });

    await test.step('verify brain screen elements', async () => {
      const brainScreen = page.locator('[data-testid="brain-screen"]');
      await expect(brainScreen).toBeVisible();

      const brainViz = page.locator('[data-testid="brain-visualization"]');
      await expect(brainViz).toBeVisible();

      const regionList = page.locator('[data-testid="region-list"]');
      await expect(regionList).toBeVisible();

      // Verify all 7 regions are listed
      const regionItems = page.locator('.region-item');
      await expect(regionItems).toHaveCount(7);
    });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'brain-screen.png'), fullPage: true });
  });

  test('should render stats screen', async ({ page }) => {
    await test.step('navigate to stats tab', async () => {
      await page.locator('[data-testid="nav-stats"]').click();
    });

    await test.step('verify stats screen elements', async () => {
      const statsScreen = page.locator('[data-testid="stats-screen"]');
      await expect(statsScreen).toBeVisible();

      // Verify stat cards
      await expect(page.locator('.stat-card')).toHaveCount(6);

      // Verify evolution stage is shown
      await expect(statsScreen).toContainText('Infant');
      await expect(statsScreen).toContainText('Level 3');

      // Verify cognitive traits
      await expect(statsScreen).toContainText('Curiosity');
      await expect(statsScreen).toContainText('Vocabulary');
      await expect(statsScreen).toContainText('Empathy');
      await expect(statsScreen).toContainText('Logic');
      await expect(statsScreen).toContainText('Creativity');
    });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'stats-screen.png'), fullPage: true });
  });

  test('should render settings screen', async ({ page }) => {
    await test.step('navigate to settings tab', async () => {
      await page.locator('[data-testid="nav-settings"]').click();
    });

    await test.step('verify settings screen elements', async () => {
      const settingsScreen = page.locator('[data-testid="settings-screen"]');
      await expect(settingsScreen).toBeVisible();

      // Verify settings groups
      await expect(settingsScreen).toContainText('AI Model');
      await expect(settingsScreen).toContainText('Appearance');
      await expect(settingsScreen).toContainText('Data & Privacy');
      await expect(settingsScreen).toContainText('About');

      // Verify specific settings
      await expect(settingsScreen).toContainText('Temperature');
      await expect(settingsScreen).toContainText('Dark Mode');
      await expect(settingsScreen).toContainText('0.2.0-alpha');
    });

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, 'settings-screen.png'), fullPage: true });
  });

  test('should display across different viewport sizes', async ({ page }) => {
    const viewports = [
      { width: 360, height: 640, name: 'small-android' },
      { width: 375, height: 812, name: 'iphone-x' },
      { width: 414, height: 896, name: 'iphone-xr' },
    ];

    for (const vp of viewports) {
      await test.step(`test at ${vp.width}x${vp.height} (${vp.name})`, async () => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/');

        // Verify the chat screen is visible at this size
        const chatScreen = page.locator('[data-testid="chat-screen"]');
        await expect(chatScreen).toBeVisible();

        // Verify bottom nav is visible
        const bottomNav = page.locator('[data-testid="bottom-nav"]');
        await expect(bottomNav).toBeVisible();

        // Verify header is visible
        const header = page.locator('[data-testid="header"]');
        await expect(header).toBeVisible();

        await page.screenshot({
          path: path.join(SCREENSHOT_DIR, `viewport-${vp.name}.png`),
          fullPage: true,
        });
      });
    }
  });
});
