import { test, expect } from '@playwright/test'

test.describe('Dashboard page', () => {
  test('loads and shows title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('GSC Manager')
    await expect(page.locator('h1')).toHaveText('Sites')
  })

  test('has navigation bar with links', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('nav')
    await expect(nav).toBeVisible()
    await expect(nav.locator('a', { hasText: 'GSC Manager' })).toBeVisible()
    await expect(nav.locator('a', { hasText: 'Dashboard' })).toBeVisible()
    await expect(nav.locator('a', { hasText: 'Settings' })).toBeVisible()
  })

  test('shows site cards, empty state, or error after loading', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const cards = page.locator('.grid > *')
    const emptyState = page.getByText('No sites found')
    const errorBanner = page.locator('.text-danger')

    const cardCount = await cards.count()
    const hasEmpty = await emptyState.isVisible().catch(() => false)
    const hasError = await errorBanner.isVisible().catch(() => false)

    // One of these must be true — sites loaded, empty state, or error displayed
    expect(cardCount > 0 || hasEmpty || hasError).toBe(true)
  })

  test('shows stats line', async ({ page }) => {
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    // Stats line: "X sites · Y verified · Z pending"
    await expect(page.locator('text=/\\d+ sites/')).toBeVisible()
  })

  test('has refresh button', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible()
  })
})

test.describe('Settings page', () => {
  test('loads and shows heading', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.locator('h1')).toHaveText('Settings')
  })

  test('has Google Account section', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.locator('h2', { hasText: 'Google Account' })).toBeVisible()
  })

  test('shows connection status after loading', async ({ page }) => {
    await page.goto('/settings')
    await page.waitForLoadState('networkidle')
    // Either "Connected" or "Not connected"
    const status = page.locator('text=/Connected|Not connected/')
    await expect(status).toBeVisible()
  })
})

test.describe('Navigation', () => {
  test('navigates between Dashboard and Settings', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Sites')

    // Go to Settings
    await page.locator('nav a', { hasText: 'Settings' }).click()
    await expect(page.locator('h1')).toHaveText('Settings')

    // Go back to Dashboard
    await page.locator('nav a', { hasText: 'Dashboard' }).click()
    await expect(page.locator('h1')).toHaveText('Sites')
  })

  test('brand link goes to dashboard', async ({ page }) => {
    await page.goto('/settings')
    await page.locator('nav a', { hasText: 'GSC Manager' }).click()
    await expect(page.locator('h1')).toHaveText('Sites')
  })
})

test.describe('Mobile responsive', () => {
  test('renders dashboard at 375px width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/')
    await expect(page.locator('h1')).toHaveText('Sites')
    await expect(page.locator('nav')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible()
  })
})
