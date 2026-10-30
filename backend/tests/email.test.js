import { test } from 'node:test';
import assert from 'node:assert/strict';
import { setup,registration,account,login,prisma } from './helpers.js';
const tokenOf=s=>new URL(s.outbox.at(-1).url).searchParams.get('token');
test('token_is_hashed_expires_and_is_single_use',async()=>{
  const s=setup(),agent=s.agent();await agent.post('/api/auth/register').send(registration()).expect(201);
  assert.equal(s.outbox.length,1);const token=tokenOf(s);
  const row=await prisma.verification.findFirst({where:{user:{email:s.outbox[0].to}}});assert.notEqual(row.hash,token);
  assert.equal((await agent.post('/api/auth/email/verify').send({token})).body.result,'success');
  assert.equal((await agent.post('/api/auth/email/verify').send({token})).body.result,'already_verified');
  assert.equal((await agent.post('/api/auth/email/verify').send({token:'wrong'})).body.result,'invalid');
  const b=setup(),a=b.agent();await a.post('/api/auth/register').send(registration()).expect(201);
  b.setTime('2026-10-30T20:00:01Z');assert.equal((await a.post('/api/auth/email/verify').send({token:tokenOf(b)})).body.result,'expired');
});
test('resend_enforces_60_seconds',async()=>{
  const s=setup(),agent=s.agent();await agent.post('/api/auth/register').send(registration()).expect(201);
  const previous=tokenOf(s);const early=await agent.post('/api/auth/email/resend');assert.equal(early.status,429);assert.ok(Number(early.headers['retry-after'])>0);
  s.setTime('2026-10-29T20:01:01Z');const res=await agent.post('/api/auth/email/resend').expect(200);assert.equal(res.body.retryAfter,60);assert.equal(res.body.demoToken,undefined);
  assert.equal((await agent.post('/api/auth/email/verify').send({token:previous})).body.result,'invalid');
});
test('smtp_failure_preserves_account',async()=>{
  const s=setup(),agent=s.agent(),input=registration();s.mailer.sendVerification=async()=>{throw new Error('SMTP unavailable');};
  const res=await agent.post('/api/auth/register').send(input).expect(201);assert.equal(res.body.verificationEmailSent,false);
  assert.equal((await agent.get('/api/auth/session')).body.emailVerified,false);
  s.mailer.sendVerification=async m=>s.outbox.push(m);s.setTime('2026-10-29T20:01:01Z');await agent.post('/api/auth/email/resend').expect(200);assert.equal(s.outbox.length,1);
});
test('foreign_session_is_not_replaced',async()=>{
  const s=setup(),first=s.agent();await first.post('/api/auth/register').send(registration()).expect(201);const token=tokenOf(s);
  const other=await account(),agent=s.agent();await login(agent,other);
  const res=await agent.post('/api/auth/email/verify').send({token}).expect(200);assert.equal(res.body.result,'success');assert.equal(res.body.user,undefined);
  assert.equal((await agent.get('/api/auth/session')).body.id,String(other.id));
});
test('concurrent_verification_consumes_once',async()=>{
  const s=setup(),agent=s.agent();await agent.post('/api/auth/register').send(registration()).expect(201);const token=tokenOf(s);
  const results=await Promise.all([s.agent().post('/api/auth/email/verify').send({token}),s.agent().post('/api/auth/email/verify').send({token})]);
  assert.deepEqual(results.map(r=>r.body.result).sort(),['already_verified','success']);
});
