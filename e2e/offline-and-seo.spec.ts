import { expect, test } from "@playwright/test";

test("works offline after the first visit", async ({ page, context }) => {
  await page.goto("/");
  await expect(page.getByTestId("due-count")).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // Let the install step finish precaching the shell.
  await page.waitForFunction(async () => (await caches.keys()).some((k) => k.startsWith("shell-")));
  await page.waitForFunction(async () => {
    const c = await caches.open((await caches.keys()).find((k) => k.startsWith("shell-")) ?? "");
    return !!(await c.match("/content.json")) && !!(await c.match("/study"));
  });
  await page.reload();
  await context.setOffline(true);
  await page.goto("/study?set=set-4&mode=cards");
  await expect(page.getByTestId("card")).toBeVisible();
  await page.getByRole("button", { name: /I know it/ }).click();
  await expect(page.getByTestId("score")).toHaveText("Learned: 1/48");
  await context.setOffline(false);
});

test("word pages are server-rendered with structured data", async ({ request }) => {
  const res = await request.get("/es/palabra/suceso");
  expect(res.status()).toBe(200);
  const html = await res.text();
  expect(html.match(/<h1/g)).toHaveLength(1);
  expect(html).toContain("“Event” in Spanish is el suceso");
  expect(html).toContain('"@type":"DefinedTerm"');
  expect(html).toContain('"@type":"FAQPage"');
  expect(html).toContain('"@type":"BreadcrumbList"');
  expect(html).toContain("What is the difference between suceso and éxito?");
  expect(html).toMatch(/<link rel="canonical"/);
  expect(html).toMatch(/hrefLang="en"/);
});

test("private notes never reach public pages", async ({ request }) => {
  expect(await (await request.get("/es/palabra/granizo")).text()).not.toContain("dolu");
});

test("robots.txt welcomes AI crawlers and lists the sitemap index", async ({ request }) => {
  const txt = await (await request.get("/robots.txt")).text();
  for (const bot of ["GPTBot", "ClaudeBot", "PerplexityBot", "OAI-SearchBot", "Google-Extended"]) {
    expect(txt).toContain(`User-Agent: ${bot}`);
  }
  expect(txt).toContain("/sitemap.xml");
  const index = await (await request.get("/sitemap.xml")).text();
  expect(index).toContain("/sitemaps/words.xml");
  expect((await request.get("/llms.txt")).status()).toBe(200);
});
