import { test } from 'node:test'
import assert from 'node:assert/strict'
import { registrationSchema } from '../src/modules/auth/schemas.js'

const valid = {
  role: 'student',
  name: 'Estudiante Prueba',
  email: 'estudiante@uas.edu',
  password: 'TestPassword123!',
  matricula: '00123456',
  career: 'Ingeniería en Software',
}

test('registration_rejects_non_numeric_matricula_and_preserves_leading_zeroes', () => {
  for (const matricula of ['00 123', 'ABC', '2214150A', '', '1'.repeat(21)]) {
    assert.equal(
      registrationSchema.safeParse({ ...valid, matricula }).success,
      false,
      matricula,
    )
  }
  assert.equal(registrationSchema.parse(valid).matricula, '00123456')
  assert.equal(
    registrationSchema.parse({ ...valid, matricula: ' 22141502 ' }).matricula,
    '22141502',
  )
})

test('registration_requires_exactly_ten_phone_digits_when_provided', () => {
  for (const phone of [
    '668123456',
    '66812345678',
    '668 1234567',
    '+526681234567',
    '668123456A',
  ]) {
    assert.equal(
      registrationSchema.safeParse({ ...valid, phone }).success,
      false,
      phone,
    )
  }
  for (const phone of [undefined, '', '   ', '6681234567']) {
    assert.equal(
      registrationSchema.safeParse({ ...valid, phone }).success,
      true,
      String(phone),
    )
  }
})

test('registration_accepts_personal_and_company_rfc_and_normalizes_case', () => {
  for (const rfc of [
    'GODE900101AB1',
    'ABC210315AB1',
    'Ñ&A210315AB1',
    'ABCD000229AB1',
  ]) {
    assert.equal(
      registrationSchema.parse({ ...valid, rfc: ` ${rfc.toLowerCase()} ` }).rfc,
      rfc,
    )
  }
})

test('registration_rejects_impossible_rfc_dates_and_malformed_blocks', () => {
  for (const rfc of [
    'ABC991332AB1',
    'GODE990229AB1',
    'ABC210431AB1',
    'ABC210100AB1',
    'ABC210001AB1',
    'AB210101ABC',
    'A2C210101ABC',
    'ABCD210101A!1',
  ]) {
    assert.equal(
      registrationSchema.safeParse({ ...valid, rfc }).success,
      false,
      rfc,
    )
  }
})
