import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixturePath = path.resolve(
  __dirname,
  "../../../fixtures/audio/smoke_test.wav",
);

test("uploads, separates, and exposes diagnostics through the real UI", async ({
  page,
}) => {
  test.setTimeout(180_000);

  await page.goto("/");

  await expect(page.getByText("StemingHot")).toBeVisible();
  await expect(page.getByText("Waveform Timeline")).toBeVisible();
  await expect(page.getByText("Mixer & Export")).toBeVisible();

  await page.locator('input[type="file"]').setInputFiles(fixturePath);

  await expect(page.getByText("smoke_test")).toBeVisible();
  await page.getByRole("button", { name: "Separate Stems" }).click();

  await expect(page.getByText("Diagnostics")).toBeVisible();
  await page.getByRole("button", { name: /Diagnostics/i }).click();

  await expect(page.getByText("Request", { exact: true })).toBeVisible();

  await page.waitForFunction(() => {
    const body = document.body.innerText;
    return body.includes("Download All Stems") || body.includes("Separation failed");
  }, { timeout: 120_000 });

  await expect(page.getByText("Separation failed")).toHaveCount(0);
  await expect(page.getByText("Download All Stems")).toBeVisible();
});
