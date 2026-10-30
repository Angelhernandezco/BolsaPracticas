import { test, expect } from "@playwright/test"
import { login, password, unique, verificationUrl } from "./fixtures.js"
test("homepage CTA has upper separation", async ({ page }, info) => {
  await page.goto("/")
  const cta = page.locator(".cta-section")
  await expect(cta).toBeVisible()
  expect(
    await cta.evaluate((e) => parseFloat(getComputedStyle(e).paddingTop)),
  ).toBeGreaterThanOrEqual(24)
  await cta.screenshot({ path: info.outputPath("cta.png") })
})
for (const viewport of [
  { width: 1366, height: 600 },
  { width: 375, height: 667 },
  { width: 667, height: 375 },
  { width: 683, height: 300 },
])
  test(`review notice and actions fit ${viewport.width}x${viewport.height}`, async ({
    page,
  }, info) => {
    await page.setViewportSize(viewport)
    const id = unique(),
      email = `layout-${id}@example.com`,
      name = `Empresa ${id}`
    const res = await page.request.post("/api/auth/register", {
      data: {
        role: "company",
        name,
        email,
        password,
        rfc: `LYT210101${id.slice(-3)}`,
        giro: "Servicios y tecnología",
        address:
          "Dirección larga para revisar ajuste de textos y accesibilidad en pantallas de poca altura ".repeat(
            2,
          ),
      },
    })
    expect(res.status()).toBe(201)
    const token = new URL(await verificationUrl(email)).searchParams.get(
      "token",
    )
    await page.request.post("/api/auth/email/verify", { data: { token } })
    await page.request.post("/api/auth/logout")
    await login(page, "e2e-admin@example.com")
    await page.goto("/admin/solicitudes")
    await page
      .locator(".candidate-card")
      .filter({ hasText: name })
      .getByRole("button", { name: "Abrir ficha de revisión" })
      .click()
    const dialog = page.getByRole("dialog")
    await dialog.getByRole("checkbox").check()
    await dialog
      .getByRole("button", { name: "Guardar convenio", exact: true })
      .click()
    const notice = dialog.locator(".notice.success")
    await expect(notice).toBeVisible()
    await notice.scrollIntoViewIfNeeded()
    const spacing = await notice.evaluate((e) => {
      const c = getComputedStyle(e)
      return {
        top: parseFloat(c.marginTop),
        bottom: parseFloat(c.marginBottom),
        padding: parseFloat(c.paddingTop),
      }
    })
    expect(spacing.top).toBeGreaterThanOrEqual(12)
    expect(spacing.bottom).toBeGreaterThanOrEqual(12)
    expect(spacing.padding).toBeGreaterThanOrEqual(12)
    const actions = dialog.locator(".modal-actions"),
      rect = await actions.boundingBox()
    expect(rect.y).toBeGreaterThanOrEqual(0)
    expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height)
    expect(await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth)).toBe(
      true,
    )
    await expect(
      dialog.getByRole("button", { name: "Aprobar", exact: true }),
    ).toBeInViewport()
    await page.screenshot({ path: info.outputPath("review.png") })
  })
