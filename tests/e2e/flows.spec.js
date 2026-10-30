import { test, expect } from "@playwright/test"

import { login, password, verificationUrl, unique } from "./fixtures.js"

for (const domain of ["uas.edu", "uas.edu.mx"])
  test(`register and verify ${domain}`, async ({ page }) => {
    const id = unique(),
      email = `student-${id}@${domain}`
    await page.goto("/registro")
    await page
      .getByLabel("Nombre completo", { exact: true })
      .fill("Estudiante Integración")
    await page.getByLabel(/^Correo institucional/).fill(email)
    await page.getByLabel("Matrícula", { exact: true }).fill(id)
    await page
      .getByRole("combobox")
      .selectOption({ label: "Ingeniería en Software" })
    await page.getByLabel(/^Contraseña/).fill(password)
    await page
      .getByLabel("Confirmar contraseña", { exact: true })
      .fill(password)
    await page.getByRole("button", { name: "Crear mi cuenta" }).click()
    await expect(page).toHaveURL(/verificar-correo/)
    await expect(page.getByText("Abrir enlace de demostración")).toHaveCount(0)

    await page.goto(await verificationUrl(email))
    await expect(
      page.getByRole("heading", { name: /Correo (ya )?verificado/ }),
    ).toBeVisible()
    await page.getByRole("link", { name: "Continuar", exact: true }).click()
    await expect(page).toHaveURL(/estudiante$/)
  })

test("verify and approve company through administrator", async ({
  page,
  browser,
}) => {
  const id = unique(),
    email = `company-${id}@example.com`,
    name = `Empresa ${id}`
  await page.goto("/registro?rol=company")
  await page.getByLabel("Nombre o razón social", { exact: true }).fill(name)
  await page.getByLabel("Correo electrónico", { exact: true }).fill(email)
  await page.getByLabel(/^RFC/).fill(`TST${id.slice(-9)}`)
  await page.getByLabel("Giro", { exact: true }).fill("Tecnología")
  await page
    .getByLabel("Dirección", { exact: true })
    .fill("Dirección de prueba")
  await page.getByLabel(/^Contraseña/).fill(password)
  await page.getByLabel("Confirmar contraseña", { exact: true }).fill(password)
  await page.getByRole("button", { name: "Crear mi cuenta" }).click()
  await expect(page).toHaveURL(/verificar-correo/)
  await page.goto(await verificationUrl(email))
  await page.getByRole("link", { name: "Continuar", exact: true }).click()
  await expect(page).toHaveURL(/estado-solicitud/)

  const context = await browser.newContext(),
    admin = await context.newPage()
  await login(admin, "e2e-admin@example.com")
  await admin.goto("/admin/solicitudes")
  const card = admin.locator(".candidate-card").filter({ hasText: name })
  await card.getByRole("button", { name: "Abrir ficha de revisión" }).click()
  const dialog = admin.getByRole("dialog")
  await dialog.getByLabel("Fecha inicial del convenio",{exact:true}).fill("2026-01-01"); await dialog.getByLabel("Fecha final del convenio",{exact:true}).fill("2027-12-31")
  await dialog
    .getByRole("button", { name: "Guardar convenio", exact: true })
    .click()
  await expect(
    dialog.getByText(/El convenio se actualizó correctamente/),
  ).toBeVisible()
  await dialog.getByRole("button", { name: "Aprobar", exact: true }).click()
  await admin.getByRole("button", { name: "Confirmar aprobación" }).click()
  await expect(admin.getByRole("dialog")).toHaveCount(0)
  await page.reload()
  await expect(page).toHaveURL(/empresa$/)
  await context.close()
})

test("publish upload apply review close and retain history", async ({
  page,
  browser,
}) => {
  const title = `Prácticas ${unique()}`
  await login(page, "e2e-company@example.com")
  await page.goto("/empresa/convocatorias/nueva")
  await page
    .getByLabel("Título de la convocatoria", { exact: true })
    .fill(title)
  await page.getByLabel("Área profesional", { exact: true }).fill("Software")
  await page
    .getByLabel("Descripción de la vacante", { exact: true })
    .fill("Aprende desarrollo de software con nosotros.")
  await page.getByLabel("Nombre del contacto", { exact: true }).fill("Contacto")
  await page
    .getByLabel("Correo del contacto", { exact: true })
    .fill("contact@example.com")
  await page.getByLabel(/^Fecha de cierre/).fill("2027-12-31")
  await page
    .locator(".career-option")
    .filter({ hasText: "Ingeniería en Software" })
    .locator("input")
    .check()
  await page
    .getByRole("button", { name: "Publicar convocatoria", exact: true })
    .click()
  await expect(page).toHaveURL(/empresa\/convocatorias$/)

  const row = page.locator(".table-row").filter({ hasText: title })
  const candidateLink = await row
    .getByRole("link", { name: /Candidatos|Ver candidatos/ })
    .getAttribute("href")
  const id = candidateLink.split("/")[3]

  const context = await browser.newContext(),
    student = await context.newPage()
  await login(student)
  await student.goto("/estudiante/curriculum")
  await student.locator("input[type=file]").setInputFiles("frontend/public/demo-cv.pdf")
  await student.getByRole("button", { name: "Guardar currículum" }).click()
  await expect(
    student.getByText("Tu currículum se actualizó correctamente."),
  ).toBeVisible()
  await student.reload()
  await expect(student.locator(".current-document")).toContainText(
    "demo-cv.pdf",
  )
  await student.goto(`/estudiante/convocatorias/${id}`)
  await expect(student.getByText("Sin convenio", {exact:true})).toBeVisible()
  await student.getByRole("button", { name: /Postularme ahora/ }).click()
  await expect(
    student.getByText("Postulación registrada", { exact: true }),
  ).toBeVisible()

  await page.goto(candidateLink)
  await page.getByRole("button", { name: "Ver y administrar" }).first().click()
  await page.getByRole("dialog").getByRole("combobox").selectOption("ACEPTADA")
  await page.getByRole("button", { name: "Guardar estado" }).click()
  await page.goto("/empresa/convocatorias")
  await page.getByLabel("Buscar", { exact: true }).fill(title)
  await page
    .getByRole("button", { name: "Cerrar convocatoria", exact: true })
    .first()
    .click()
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Sí, cerrar convocatoria", exact: true })
    .click()
  await student.goto("/estudiante/postulaciones")
  await expect(student.getByText(title, { exact: true })).toBeVisible()
  await expect(
    student.getByText("Aceptada", { exact: true }).first(),
  ).toBeVisible()
  await context.close()
})
