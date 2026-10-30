import { test } from 'node:test'
import assert from 'node:assert/strict'
import request from 'supertest'
import { Readable } from 'node:stream'
import { setup, account, login, prisma } from './helpers.js'
import { createApp } from '../src/app.js'
import { createStorage } from '../src/services/storage/index.js'

const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
)
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF')

test('uploaded_images_reach_opportunities_history_and_candidates_with_permissions', async () => {
  const s = setup(),
    employer = await account('company'),
    student = await account(),
    companyAgent = s.agent(),
    studentAgent = s.agent()
  await login(companyAgent, employer)
  await login(studentAgent, student)
  const logo = (
    await companyAgent
      .post('/api/profiles/image')
      .attach('file', png, 'logo.png')
      .expect(200)
  ).body.logo
  const photo = (
    await studentAgent
      .post('/api/profiles/image')
      .attach('file', png, 'photo.png')
      .expect(200)
  ).body.photo
  await studentAgent
    .post('/api/students/cv')
    .attach('file', pdf, 'CV.pdf')
    .expect(200)
  const opportunity = (
    await companyAgent
      .post('/api/company/opportunities')
      .send({
        title: 'Prácticas con logotipo',
        description: 'Descripción',
        area: 'Software',
        slots: 1,
        contactName: 'Contacto',
        contactEmail: 'contacto@example.com',
        careerIds: ['Ingeniería en Software'],
        closingDate: '2099-12-31',
        intent: 'publish',
      })
      .expect(201)
  ).body
  assert.equal(opportunity.companyLogo, logo)
  assert.equal(
    (await studentAgent.get(`/api/opportunities/${opportunity.id}`).expect(200))
      .body.companyLogo,
    logo,
  )
  assert.equal(
    (
      await studentAgent
        .post('/api/applications')
        .send({ opportunityId: opportunity.id })
        .expect(201)
    ).body.companyLogo,
    logo,
  )
  assert.equal(
    (await studentAgent.get('/api/applications/me').expect(200)).body[0]
      .companyLogo,
    logo,
  )
  assert.equal(
    (
      await companyAgent
        .get(`/api/company/opportunities/${opportunity.id}/candidates`)
        .expect(200)
    ).body[0].photo,
    photo,
  )
  await studentAgent.get(logo).expect('Content-Type', /png/).expect(200)
  await companyAgent.get(photo).expect('Content-Type', /png/).expect(200)
  const stranger = s.agent()
  await login(stranger, await account('company'))
  await stranger.get(photo).expect(403)
})

test('same_profile_image_url_reads_s3_driver_after_configuration', async () => {
  const s = setup(),
    employer = await account('company'),
    agent = s.agent()
  await login(agent, employer)
  const user = (
    await agent
      .post('/api/profiles/image')
      .attach('file', png, 'logo.png')
      .expect(200)
  ).body
  const file = await prisma.storedFile.findUniqueOrThrow({
    where: { id: user.logo.split('/').at(-1) },
  })
  await prisma.storedFile.update({
    where: { id: file.id },
    data: { driver: 's3' },
  })
  const config = {
      ...s.config,
      storageDriver: 's3',
      s3Bucket: 'private-images-test',
      awsRegion: 'us-west-2',
    },
    commands = []
  const storage = createStorage(config, {
    s3Client: {
      async send(command) {
        commands.push(command)
        return { Body: Readable.from([png]) }
      },
    },
  })
  const remote = request.agent(
    createApp({
      prisma,
      config,
      storage,
      mailer: s.mailer,
      clock: () => new Date('2026-10-29T20:00:00Z'),
    }),
  )
  await login(remote, employer)
  const response = await remote
    .get(user.logo)
    .expect('Content-Type', /png/)
    .expect(200)
  assert.deepEqual(response.body, png)
  assert.equal(commands[0].input.Bucket, 'private-images-test')
  assert.equal(commands[0].input.Key, file.key)
})
