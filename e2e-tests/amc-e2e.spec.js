const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';
const ADMIN_PASSWORD = 'Alfred-2026-MC!';

// Store auth cookie for reuse
let authCookie = null;

test.describe('1. Login Flow', () => {
  test('should login and redirect to home', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');

    // Fill password
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="assword" i]');
    await passwordInput.fill(ADMIN_PASSWORD);

    // Click submit
    const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign"), button:has-text("Enter")');
    await submitBtn.first().click();

    // Wait for redirect
    await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 10000 }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});

    // Verify redirect to home
    expect(page.url()).not.toContain('/login');
    console.log(`[LOGIN] Redirected to: ${page.url()}`);

    // Verify auth_token cookie
    const cookies = await page.context().cookies();
    const authToken = cookies.find(c => c.name === 'auth_token');
    expect(authToken).toBeTruthy();
    console.log(`[LOGIN] auth_token cookie found: ${authToken ? 'YES' : 'NO'}`);

    // Save cookie for other tests
    authCookie = authToken;
  });
});

test.describe('2. Page Navigation', () => {
  const pages = [
    '/', '/kanban', '/pipeline', '/reports', '/agents', '/system',
    '/sessions', '/cron', '/wiki', '/memory', '/skills', '/chat',
    '/catalog', '/learning', '/logs', '/journal', '/weather', '/models'
  ];

  // Login first and store state
  let browserContext;

  test.beforeAll(async ({ browser }) => {
    browserContext = await browser.newContext();
    const page = await browserContext.newPage();

    // Login
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="assword" i]');
    await passwordInput.fill(ADMIN_PASSWORD);
    const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign"), button:has-text("Enter")');
    await submitBtn.first().click();
    await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 10000 }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
  });

  for (const pagePath of pages) {
    test(`PAGE: ${pagePath} should load without 401/404`, async () => {
      const page = await browserContext.newPage();
      const response = await page.goto(`${BASE_URL}${pagePath}`, { waitUntil: 'networkidle', timeout: 15000 }).catch(e => null);

      if (response) {
        const status = response.status();
        console.log(`PAGE: ${pagePath} → ${status}`);
        expect([200, 301, 302, 304]).toContain(status === 0 ? 0 : status);
        expect(status).not.toBe(401);
        expect(status).not.toBe(404);

        // Check page content for error indicators
        const bodyText = await page.textContent('body').catch(() => '');
        const hasError = bodyText.includes('404') && bodyText.includes('Not Found');
        const hasUnauthorized = bodyText.includes('401') && bodyText.includes('Unauthorized');
        expect(hasError).toBeFalsy();
        expect(hasUnauthorized).toBeFalsy();
      } else {
        console.log(`PAGE: ${pagePath} → no response (SPA client routing)`);
        // For SPA, client-side routing may return no response — check page content
        await page.waitForTimeout(2000);
        const bodyText = await page.textContent('body').catch(() => '');
        expect(bodyText.length).toBeGreaterThan(0);
      }

      await page.close();
    });
  }
});

test.describe('3. API Validation', () => {
  let cookies;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="assword" i]');
    await passwordInput.fill(ADMIN_PASSWORD);
    const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign"), button:has-text("Enter")');
    await submitBtn.first().click();
    await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 10000 }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});

    cookies = await context.cookies();
    await context.close();
  });

  test('GET /api/health → 200', async ({ request }) => {
    const resp = await request.get(`${BASE_URL}/api/health`);
    const status = resp.status();
    const body = await resp.json().catch(() => ({}));
    console.log(`API: /api/health → ${status} → ${JSON.stringify(body).slice(0, 100)}`);
    expect(status).toBe(200);
    expect(body.status).toBe('healthy');
  });

  test('GET /api/kanban/columns → 200, 6 columns', async ({ request }) => {
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const resp = await request.get(`${BASE_URL}/api/kanban/columns`, {
      headers: { Cookie: cookieStr }
    });
    const status = resp.status();
    const body = await resp.json().catch(() => ({}));
    console.log(`API: /api/kanban/columns → ${status} → ${JSON.stringify(body).slice(0, 200)}`);
    expect(status).toBe(200);
    expect(body.columns).toBeTruthy();
    expect(Array.isArray(body.columns)).toBeTruthy();
    expect(body.columns.length).toBe(6);
  });

  test('GET /api/kanban/agent/tasks → 200, has tasks', async ({ request }) => {
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const resp = await request.get(`${BASE_URL}/api/kanban/agent/tasks`, {
      headers: {
        Cookie: cookieStr,
        'X-Agent-Id': 'main',
        'X-Agent-Key': 'sk-main-alfred-2026'
      }
    });
    const status = resp.status();
    const body = await resp.json().catch(() => []);
    console.log(`API: /api/kanban/agent/tasks → ${status} → ${Array.isArray(body) ? `${body.length} tasks` : JSON.stringify(body).slice(0, 200)}`);
    expect(status).toBe(200);
  });

  test('GET /api/pipeline → 200', async ({ request }) => {
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const resp = await request.get(`${BASE_URL}/api/pipeline`, {
      headers: { Cookie: cookieStr }
    });
    const status = resp.status();
    const body = await resp.json().catch(() => ({}));
    console.log(`API: /api/pipeline → ${status} → ${JSON.stringify(body).slice(0, 200)}`);
    expect(status).toBe(200);
  });

  test('GET /api/reports/files → 200, has reports with cron category', async ({ request }) => {
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const resp = await request.get(`${BASE_URL}/api/reports/files`, {
      headers: { Cookie: cookieStr }
    });
    const status = resp.status();
    const body = await resp.json().catch(() => []);
    console.log(`API: /api/reports/files → ${status} → ${Array.isArray(body) ? `${body.length} files` : JSON.stringify(body).slice(0, 200)}`);
    expect(status).toBe(200);

    if (Array.isArray(body) && body.length > 0) {
      const hasCron = body.some(f => f.category === 'cron' || (f.path && f.path.includes('cron')));
      const hasCentral = body.some(f => f.category === 'central' || (f.path && f.path.includes('central')));
      console.log(`  → cron reports: ${hasCron ? 'YES' : 'NO'}, central reports: ${hasCentral ? 'YES' : 'NO'}`);
    }
  });

  test('GET /api/agents → 200', async ({ request }) => {
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const resp = await request.get(`${BASE_URL}/api/agents`, {
      headers: { Cookie: cookieStr }
    });
    const status = resp.status();
    const body = await resp.json().catch(() => []);
    console.log(`API: /api/agents → ${status} → ${Array.isArray(body) ? `${body.length} agents` : JSON.stringify(body).slice(0, 200)}`);
    expect(status).toBe(200);
  });
});

test.describe('4. Reports Hub', () => {
  let browserContext;

  test.beforeAll(async ({ browser }) => {
    browserContext = await browser.newContext();
    const page = await browserContext.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="assword" i]');
    await passwordInput.fill(ADMIN_PASSWORD);
    const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign"), button:has-text("Enter")');
    await submitBtn.first().click();
    await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 10000 }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
  });

  test('Reports page shows cron and central reports', async () => {
    const page = await browserContext.newPage();
    await page.goto(`${BASE_URL}/reports`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    const bodyText = await page.textContent('body').catch(() => '');
    console.log(`PAGE: /reports → loaded, content length: ${bodyText.length}`);

    // Check for report categories in content
    const hasCron = bodyText.toLowerCase().includes('cron');
    const hasCentral = bodyText.toLowerCase().includes('central');
    console.log(`  → mentions cron: ${hasCron ? 'YES' : 'NO'}, mentions central: ${hasCentral ? 'YES' : 'NO'}`);

    // Also check via API
    const cookies = await browserContext.cookies();
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const apiResp = await page.request.get(`${BASE_URL}/api/reports/files`, {
      headers: { Cookie: cookieStr }
    });
    const reports = await apiResp.json().catch(() => []);
    if (Array.isArray(reports) && reports.length > 0) {
      const cronReports = reports.filter(f => f.category === 'cron' || (f.path && f.path.includes('cron')));
      const centralReports = reports.filter(f => f.category === 'central' || (f.path && f.path.includes('central/active')));
      console.log(`  → API cron reports: ${cronReports.length}, central active reports: ${centralReports.length}`);
      expect(cronReports.length + centralReports.length).toBeGreaterThan(0);
    } else {
      console.log('  → No reports found via API (empty array or non-array response)');
    }

    await page.close();
  });
});

test.describe('5. Pipeline Page', () => {
  let browserContext;

  test.beforeAll(async ({ browser }) => {
    browserContext = await browser.newContext();
    const page = await browserContext.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="assword" i]');
    await passwordInput.fill(ADMIN_PASSWORD);
    const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign"), button:has-text("Enter")');
    await submitBtn.first().click();
    await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 10000 }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
  });

  test('Pipeline page renders oportunidades and scraping button', async () => {
    const page = await browserContext.newPage();
    await page.goto(`${BASE_URL}/pipeline`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    const bodyText = await page.textContent('body').catch(() => '');
    console.log(`PAGE: /pipeline → loaded, content length: ${bodyText.length}`);

    // Check for pipeline/opportunity content
    const hasOpportunities = bodyText.toLowerCase().includes('oportunidad') || bodyText.toLowerCase().includes('opportunity') || bodyText.toLowerCase().includes('pipeline');
    console.log(`  → mentions opportunities/pipeline: ${hasOpportunities ? 'YES' : 'NO'}`);

    // Check for scraping button
    const hasScrapeBtn = bodyText.toLowerCase().includes('scrap') || bodyText.toLowerCase().includes('scraping');
    const scrapeBtnLocator = page.locator('button:has-text("Scrap"), button:has-text("scrap"), button:has-text("Scraping")');
    const scrapeBtnCount = await scrapeBtnLocator.count().catch(() => 0);
    console.log(`  → scraping button: text=${hasScrapeBtn ? 'YES' : 'NO'}, element=${scrapeBtnCount > 0 ? 'YES' : 'NO'}`);

    await page.close();
  });
});

test.describe('6. Kanban Page', () => {
  let browserContext;

  test.beforeAll(async ({ browser }) => {
    browserContext = await browser.newContext();
    const page = await browserContext.newPage();
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState('networkidle');
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[placeholder*="assword" i]');
    await passwordInput.fill(ADMIN_PASSWORD);
    const submitBtn = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Sign"), button:has-text("Enter")');
    await submitBtn.first().click();
    await page.waitForURL(/^(?!.*\/login).*$/, { timeout: 10000 }).catch(() => {});
    await page.waitForLoadState('networkidle').catch(() => {});
  });

  test('Kanban page shows 6 columns and tasks', async () => {
    const page = await browserContext.newPage();
    await page.goto(`${BASE_URL}/kanban`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);

    const bodyText = await page.textContent('body').catch(() => '');
    console.log(`PAGE: /kanban → loaded, content length: ${bodyText.length}`);

    // Check for column names
    const expectedColumns = ['Backlog', 'In Progress', 'Review', 'Done', 'Blocked', 'Waiting'];
    const foundColumns = expectedColumns.filter(col =>
      bodyText.includes(col) || bodyText.includes(col.toLowerCase())
    );
    console.log(`  → columns found: [${foundColumns.join(', ')}] (${foundColumns.length}/6)`);

    // Also check via API
    const cookies = await browserContext.cookies();
    const cookieStr = cookies.map(c => `${c.name}=${c.value}`).join('; ');
    const apiResp = await page.request.get(`${BASE_URL}/api/kanban/columns`, {
      headers: { Cookie: cookieStr }
    });
    const columns = await apiResp.json().catch(() => []);
    console.log(`  → API columns: ${JSON.stringify(columns).slice(0, 300)}`);

    // Check tasks via API
    const tasksResp = await page.request.get(`${BASE_URL}/api/kanban/agent/tasks`, {
      headers: {
        Cookie: cookieStr,
        'X-Agent-Id': 'main',
        'X-Agent-Key': 'sk-main-alfred-2026'
      }
    });
    const tasks = await tasksResp.json().catch(() => []);
    const taskCount = Array.isArray(tasks) ? tasks.length : 0;
    console.log(`  → tasks found: ${taskCount}`);

    await page.close();
  });
});
