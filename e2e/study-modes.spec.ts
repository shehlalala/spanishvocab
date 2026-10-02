import { expect, test } from "@playwright/test";
import { entryByDisplay, sentenceByText, stripAccents } from "./helpers";

test.describe("study modes", () => {
  test("flashcards: flip, grade, and progress survives a reload", async ({ page }) => {
    await page.goto("/study?set=set-3&mode=cards");
    await expect(page.getByTestId("progress")).toHaveText("1 / 29");
    await expect(page.getByTestId("meaning")).toHaveCount(0);
    const word = (await page.getByTestId("word").textContent()) ?? "";
    await page.getByTestId("card").click();
    await expect(page.getByTestId("meaning")).toHaveText((await entryByDisplay(page, word)).meaning);

    await page.getByRole("button", { name: /I know it/ }).click();
    await expect(page.getByTestId("progress")).toHaveText("2 / 29");
    await expect(page.getByTestId("score")).toHaveText("Learned: 1/29");

    // "Study again" puts the card back at the end of the queue.
    await page.getByRole("button", { name: /Study again/ }).click();
    await expect(page.getByTestId("progress")).toHaveText("3 / 30");

    await page.reload();
    await expect(page.getByTestId("score")).toHaveText("Learned: 1/29");
    // The known card is scheduled for tomorrow, so it is no longer in today's queue.
    await expect(page.getByTestId("progress")).toHaveText("1 / 28");
  });

  test("quiz: picking the right meaning scores a point", async ({ page }) => {
    await page.goto("/study?set=set-3&mode=quiz");
    const word = (await page.getByTestId("word").textContent()) ?? "";
    const { meaning } = await entryByDisplay(page, word);
    await expect(page.getByTestId("option")).toHaveCount(4);
    await page
      .getByTestId("option")
      .filter({ hasText: new RegExp(`^${meaning.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) })
      .click();
    await expect(page.getByTestId("score")).toHaveText("Score: 1");
    await expect(page.locator(".btn-right")).toHaveText(meaning);
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("progress")).toHaveText("2 / 29");
  });

  test("sentences: accent-tolerant fill-in, then a wrong answer", async ({ page }) => {
    await page.goto("/study?set=set-4&mode=write");
    const text = (await page.getByTestId("sentence").textContent()) ?? "";
    const s = await sentenceByText(page, text.split(" ")[0] ?? text);
    await page.getByTestId("answer").fill(stripAccents(s.answers[0] ?? "").toUpperCase());
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("verdict")).toContainText("Correct");
    await expect(page.getByTestId("score")).toHaveText("Score: 1");
    await page.getByRole("button", { name: "Next sentence" }).click();

    await page.getByRole("button", { name: "Hint" }).click();
    await expect(page.getByTestId("hint")).toContainText("Meaning:");
    await page.getByTestId("answer").fill("zzzz");
    await page.getByRole("button", { name: "Check" }).click();
    await expect(page.getByTestId("verdict")).toContainText("You wrote “zzzz”");
    await expect(page.getByTestId("score")).toHaveText("Score: 1");
  });

  test("sentences: sets without sentences show a helpful message", async ({ page }) => {
    await page.goto("/study?set=set-1&mode=write");
    await expect(page.getByTestId("empty")).toContainText("Sets 3–8");
  });

  test("EN → ES: article-tolerant typing with hints", async ({ page }) => {
    await page.goto("/study?set=set-3&mode=type");
    const meaning = (await page.getByTestId("prompt").textContent()) ?? "";
    const c = await (await page.request.get("/content.json")).json();
    const entry = (c.entries as { meaning: string; sets: string[]; answers: string[]; article: string | null }[]).find(
      (e) => e.meaning === meaning && e.sets.includes("set-3"),
    );
    expect(entry).toBeTruthy();
    await page.getByRole("button", { name: "Hint" }).click();
    await expect(page.getByTestId("hint")).toContainText("letters, starts with");
    await page.getByTestId("answer").fill(`${entry?.article ?? ""} ${entry?.answers[0] ?? ""}`.trim());
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("verdict")).toContainText("¡Correcto!");
  });
});

test("Due today starts a review session", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("due-count")).toHaveText("15");
  await page.getByTestId("start").click();
  await expect(page.getByTestId("progress")).toHaveText("1 / 15");
  await expect(page.getByTestId("word")).toHaveText("el trueno");
});

test("Latin American setting changes the shown word", async ({ page }) => {
  await page.goto("/settings");
  await page.getByRole("radio", { name: /Latin America/ }).check();
  await page.goto("/study?set=b1-coches-y-conduccion&mode=cards");
  const words: string[] = [];
  for (let i = 0; i < 40; i++) {
    const w = (await page.getByTestId("word").textContent()) ?? "";
    words.push(w);
    if (w === "la cajuela") break;
    await page.getByRole("button", { name: /I know it/ }).click();
  }
  expect(words).toContain("la cajuela");
  expect(words).not.toContain("el maletero");
});

test("import a set by pasting words", async ({ page }) => {
  await page.goto("/import");
  await page.getByTestId("set-name").fill("Tiempo");
  await page.getByTestId("words").fill("relámpago - lightning\nmerendar - to have a snack\nnublado - cloudy");
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(page.getByRole("textbox", { name: "Spanish word with article" }).first()).toHaveValue(/relámpago/);
  await page.getByTestId("save").click();
  await expect(page).toHaveURL(/\/study\?set=custom-tiempo/);
  await expect(page.getByTestId("progress")).toHaveText("1 / 3");
});
