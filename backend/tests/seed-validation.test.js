import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadSeedData } from '../prisma/seed-data.js'
import {
  phoneSchema,
  matriculaSchema,
  rfcSchema,
} from '../src/lib/registration-validation.js'

test('demo_accounts_can_be_edited_without_failing_identifier_validation', () => {
  for (const user of loadSeedData().users) {
    if (user.role === 'student')
      assert.equal(
        matriculaSchema.safeParse(user.matricula).success,
        true,
        user.email,
      )
    if (user.role === 'company')
      assert.equal(rfcSchema.safeParse(user.rfc).success, true, user.email)
    if (user.phone)
      assert.equal(phoneSchema.safeParse(user.phone).success, true, user.email)
  }
})
