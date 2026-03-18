import { readFile } from 'node:fs/promises';

import { test as base, type Browser, type BrowserContext, type Page } from '@playwright/test';

type AuthState = {
  sessionToken: string;
  userId: string;
};

type Fixtures = {
  userPage: Page;
  adminPage: Page;
};

async function createAuthedPage(browser: Browser, authPath: string) {
  const auth = JSON.parse(await readFile(authPath, 'utf8')) as AuthState;
  const context: BrowserContext = await browser.newContext();

  const isProduction = process.env.NODE_ENV === 'production';

  await context.addCookies([
    {
      name: isProduction
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token',
      value: auth.sessionToken,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: isProduction,
      sameSite: 'Lax',
    },
  ]);

  return context.newPage();
}

const test = base.extend<Fixtures>({
  userPage: async ({ browser }: { browser: Browser }, use: (page: Page) => Promise<void>) => {
    const page = await createAuthedPage(browser, 'tests/e2e/.auth/user.json');
    await use(page);
    await page.context().close();
  },
  adminPage: async ({ browser }: { browser: Browser }, use: (page: Page) => Promise<void>) => {
    const page = await createAuthedPage(browser, 'tests/e2e/.auth/admin.json');
    await use(page);
    await page.context().close();
  },
});

export { test };
export default test;
