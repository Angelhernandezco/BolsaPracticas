import { test, expect } from '@playwright/test'
test.use({ baseURL: 'http://localhost:8445' })

test('demo_opportunity_uses_ids_and_preserves_draft_and_seed_associations', async ({
  page,
}) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { api } = await import('/src/services/api.ts')
    const company = await api.login('empresa@demo.mx', 'Demo1234')
    const career = (await api.getCareerOptions())[0]
    const seeded = await api.getOpportunity('op-1', company)
    const input = {
      title: 'Convocatoria demo con IDs',
      description: 'Descripción',
      area: 'Software',
      slots: 1,
      contactName: 'Talento',
      contactEmail: 'talento@example.com',
      careerRecordIds: [career.id],
      closingDate: '2099-12-31',
    }
    const published = await api.saveOpportunity(input, company, 'publish')
    const draft = await api.saveOpportunity(
      { ...input, title: 'Borrador demo' },
      company,
      'draft',
    )
    await api.updateCareer(career.id, {
      name: 'Carrera demo renombrada',
      active: false,
    })
    const reopened = await api.getOpportunity(draft.id, company)
    const saved = await api.saveOpportunity(
      { ...reopened, title: 'Borrador editado' },
      company,
      'draft',
    )
    return { published, seeded, reopened, saved, careerId: career.id }
  })
  expect(result.published.careerAssociations).toContainEqual(
    expect.objectContaining({ id: result.careerId }),
  )
  expect(result.seeded.careerAssociations.length).toBeGreaterThan(0)
  expect(result.reopened.careerAssociations).toContainEqual({
    id: result.careerId,
    name: 'Carrera demo renombrada',
    active: false,
  })
  expect(result.saved.careerRecordIds).toEqual([result.careerId])
})

test('demo_registration_and_profiles_use_mutable_catalog_and_stable_ids', async ({
  page,
}) => {
  await page.goto('/')
  const result = await page.evaluate(async () => {
    const { api } = await import('/src/services/api.ts')
    await api.login('admin@demo.mx', 'Demo1234')
    const career = await api.createCareer('Nueva carrera demo')
    const input = {
      role: 'student',
      name: 'Estudiante Demo',
      email: 'nueva-carrera@uas.edu',
      password: 'Demo1234',
      matricula: 'DEMO-NEW',
      career: career.name,
    }
    const registered = await api.register(input)
    await api.updateCareer(career.id, {
      name: 'Nombre actualizado',
      active: false,
    })
    const saved = await api.updateProfile({
      ...registered,
      phone: '6681234567',
    })
    let inactiveError = ''
    try {
      await api.register({
        ...input,
        email: 'otra-carrera@uas.edu',
        matricula: 'DEMO-OTHER',
        career: 'Nombre actualizado',
      })
    } catch (error) {
      inactiveError = error.message
    }
    const seeded = await api.login('mariana.lopez@uas.edu', 'Demo1234')
    const original = (await api.listCareers()).find(
      (item) => item.name === seeded.career,
    )
    await api.updateCareer(original.id, {
      name: 'Software actual',
      active: false,
    })
    const preserved = await api.updateProfile({
      ...seeded,
      phone: '6682223333',
    })
    return { registered, saved, preserved, careerId: career.id, inactiveError }
  })
  expect(result.registered.careerId).toBe(result.careerId)
  expect(result.saved).toMatchObject({
    careerId: result.careerId,
    career: 'Nombre actualizado',
    careerActive: false,
  })
  expect(result.preserved).toMatchObject({
    career: 'Software actual',
    careerActive: false,
  })
  expect(result.inactiveError).toBeTruthy()
})
