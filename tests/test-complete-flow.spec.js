import { test, expect } from '@playwright/test';

test.describe('Complete Authentication Flow', () => {
  test('should show login form when not authenticated', async ({ page }) => {
    await page.goto('http://localhost/admin', { waitUntil: 'networkidle' });
    
    // Check for login form elements
    const emailInput = await page.locator('input[type="email"]');
    const passwordInput = await page.locator('input[type="password"]');
    const submitButton = await page.locator('button[type="submit"]');
    
    expect(await emailInput.count()).toBeGreaterThan(0);
    expect(await passwordInput.count()).toBeGreaterThan(0);
    expect(await submitButton.count()).toBeGreaterThan(0);
    
    const buttonText = await submitButton.textContent();
    expect(buttonText).toContain('Se connecter');
    
    console.log('✓ Login form is displayed for unauthenticated user');
  });

  test('should login successfully and show dashboard', async ({ page }) => {
    // Navigate to admin
    await page.goto('http://localhost/admin', { waitUntil: 'networkidle' });
    
    // Fill credentials
    await page.locator('input[type="email"]').fill('admin@gv-rdc.local');
    await page.locator('input[type="password"]').fill('SecurePassword123456');
    
    // Submit form
    console.log('Submitting login form...');
    await page.locator('button[type="submit"]').click();
    
    // Wait for navigation and network to settle
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
    
    // Verify we're on admin page
    expect(page.url()).toContain('/admin');
    
    // Check session via API
    const sessionRes = await page.request.get('http://localhost/api/auth/session');
    const session = await sessionRes.json();
    
    console.log('Session after login:', { email: session?.user?.email, role: session?.user?.role });
    expect(session?.user?.email).toBe('admin@gv-rdc.local');
    expect(session?.user?.role).toBe('super_admin');
    
    // Real UI expectation: the login form should disappear once the page is reloaded with the session
    const loginButtonText = await page.locator('body').textContent();
    expect(loginButtonText).not.toContain('Se connecter');
    
    // Dashboard should be visible
    const adminContent = await page.locator('.admin-dashboard').count();
    console.log('Admin dashboard elements:', adminContent);
    expect(adminContent).toBeGreaterThan(0);
    
    console.log('✓ Login successful, dashboard displayed');
  });

  test('should keep session when navigating between admin pages', async ({ page }) => {
    await page.goto('http://localhost/admin', { waitUntil: 'networkidle' });
    await page.locator('input[type="email"]').fill('admin@gv-rdc.local');
    await page.locator('input[type="password"]').fill('SecurePassword123456');
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);

    await page.goto('http://localhost/admin/medias', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const bodyText = await page.locator('body').textContent();
    expect(bodyText).not.toContain('Administration GV-RDC');
    expect(bodyText).toContain('Médiathèque');

    const sessionRes = await page.request.get('http://localhost/api/auth/session');
    const session = await sessionRes.json();
    expect(session?.user?.email).toBe('admin@gv-rdc.local');

    console.log('✓ Session persists while navigating across admin pages');
  });

  test('should allow logout from a secondary admin page', async ({ page }) => {
    await page.goto('http://localhost/admin', { waitUntil: 'networkidle' });
    await page.locator('input[type="email"]').fill('admin@gv-rdc.local');
    await page.locator('input[type="password"]').fill('SecurePassword123456');
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);

    await page.goto('http://localhost/admin/medias', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);

    const logoutButton = page.locator('button').filter({ hasText: 'Se déconnecter' }).first();
    await expect(logoutButton).toBeVisible({ timeout: 10000 });
    await logoutButton.click();

    await page.waitForTimeout(1000);
    const sessionRes = await page.request.get('http://localhost/api/auth/session');
    const session = await sessionRes.json();
    expect(session?.user).toBeUndefined();

    console.log('✓ Logout available from secondary admin page');
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('http://localhost/admin', { waitUntil: 'networkidle' });
    
    // Fill incorrect credentials
    await page.locator('input[type="email"]').fill('admin@gv-rdc.local');
    await page.locator('input[type="password"]').fill('WrongPassword123456');
    
    // Submit form
    await page.locator('button[type="submit"]').click();
    
    // Wait for error message
    await page.waitForTimeout(500);
    
    // Check for error message - use specific selector for admin-message
    const errorMsg = await page.locator('.admin-message[role="alert"]').textContent();
    console.log('Error message:', errorMsg);
    expect(errorMsg).toContain('Email ou mot de passe incorrect');
    
    // Should still be on /admin
    expect(page.url()).toContain('/admin');
    
    // Session should not exist
    const sessionRes = await page.request.get('http://localhost/api/auth/session');
    const session = await sessionRes.json();
    expect(session?.user?.email).toBeUndefined();
    
    console.log('✓ Invalid credentials rejected correctly');
  });

  test('should allow logout', async ({ page }) => {
    // First login
    await page.goto('http://localhost/admin', { waitUntil: 'networkidle' });
    await page.locator('input[type="email"]').fill('admin@gv-rdc.local');
    await page.locator('input[type="password"]').fill('SecurePassword123456');
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
    
    // Verify session exists
    let sessionRes = await page.request.get('http://localhost/api/auth/session');
    let session = await sessionRes.json();
    console.log('Session before logout:', session?.user?.email);
    expect(session?.user?.email).toBe('admin@gv-rdc.local');
    
    const logoutBtn = page.locator('button').filter({ hasText: 'Se déconnecter' }).first();
    await logoutBtn.waitFor({ state: 'visible', timeout: 10000 });
    console.log('Clicking logout button...');
    await logoutBtn.click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(1500);
    
    // Verify session is cleared
    sessionRes = await page.request.get('http://localhost/api/auth/session');
    session = await sessionRes.json();
    console.log('Session after logout:', session?.user);
    expect(session?.user).toBeUndefined();
    
    // Should see login form again
    const loginBodyText = await page.locator('body').textContent();
    expect(loginBodyText).toContain('Se connecter');
    
    console.log('✓ Logout successful, login form displayed again');
  });

  test('should protect API endpoint from unauthenticated users', async ({ page }) => {
    // Make unauthenticated API request
    const response = await page.request.get('http://localhost/api/admin/admins');
    
    console.log('Unauthenticated API response status:', response.status());
    expect(response.status()).toBe(403);
    
    const data = await response.json();
    console.log('Error response:', data);
    expect(data?.error).toContain('Super-admin privileges required');
    
    console.log('✓ API endpoint properly protected');
  });

  test('should allow super-admin to access admin API', async ({ browser, page }) => {
    // Create a new context with same cookies as the current session
    const context = page.context();
    
    // First login
    await page.goto('http://localhost/admin', { waitUntil: 'networkidle' });
    await page.locator('input[type="email"]').fill('admin@gv-rdc.local');
    await page.locator('input[type="password"]').fill('SecurePassword123456');
    await page.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.waitForTimeout(500);
    
    // Get the cookies from the context
    const cookies = await context.cookies();
    console.log('Available cookies:', cookies.map(c => c.name));
    
    // Create a new request context with the same cookies
    const apiContext = await browser.newContext();
    await apiContext.addCookies(cookies);
    
    // Now make authenticated API request with cookies
    const response = await apiContext.request.get('http://localhost/api/admin/admins');
    
    console.log('Authenticated API response status:', response.status());
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    console.log('Admin list count:', data?.admins?.length);
    expect(Array.isArray(data?.admins)).toBeTruthy();
    
    // Should have at least the super-admin
    expect(data?.admins?.length).toBeGreaterThan(0);
    
    const superAdmin = data.admins.find(a => a.role === 'super_admin');
    expect(superAdmin?.email).toBe('admin@gv-rdc.local');
    
    await apiContext.close();
    
    console.log('✓ Super-admin can access admin API');
  });
});
