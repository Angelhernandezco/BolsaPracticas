import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setup,account,login,prisma,registration } from './helpers.js';
const name=()=>`Carrera ${randomUUID()}`;
async function adminContext(){const s=setup(),admin=s.agent();await login(admin,await account('admin'));return {...s,admin};}
test('admin_creates_renames_deactivates_reactivates',async()=>{
  const s=await adminContext(),original=name();const created=await s.admin.post('/api/admin/careers').send({name:original}).expect(201);const id=created.body.id;
  assert.equal(created.body.active,true);const renamed=name();await s.admin.patch(`/api/admin/careers/${id}`).send({name:renamed}).expect(200);
  await s.admin.patch(`/api/admin/careers/${id}`).send({name:renamed}).expect(200);
  await s.admin.patch(`/api/admin/careers/${id}`).send({active:false}).expect(200);assert.ok(!(await s.agent().get('/api/catalogs/careers')).body.includes(renamed));
  await s.admin.patch(`/api/admin/careers/${id}`).send({active:true}).expect(200);assert.ok((await s.agent().get('/api/catalogs/careers')).body.includes(renamed));
});
test('normalized_name_unique_even_inactive',async()=>{
  const s=await adminContext(),n=name();const c=await s.admin.post('/api/admin/careers').send({name:n}).expect(201);await s.admin.patch(`/api/admin/careers/${c.body.id}`).send({active:false}).expect(200);
  await s.admin.post('/api/admin/careers').send({name:`  ${n.toUpperCase()}  `}).expect(409);
  await s.admin.patch(`/api/admin/careers/${c.body.id}`).send({name:'  '}).expect(422);
});
test('concurrent_duplicate_creation_conflicts',async()=>{
  const s=await adminContext(),n=name();const r=await Promise.all([s.admin.post('/api/admin/careers').send({name:n}),s.admin.post('/api/admin/careers').send({name:n.toUpperCase()})]);assert.deepEqual(r.map(r=>r.status).sort(),[201,409]);
});
test('non_admin_cannot_manage',async()=>{
  const s=setup();for(const role of ['student','company']){const a=s.agent();await login(a,await account(role));await a.get('/api/admin/careers').expect(403);await a.post('/api/admin/careers').send({name:name()}).expect(403);}
});
test('inactive_existing_relations_remain_editable',async()=>{
  const s=await adminContext(),n=name(),career=(await s.admin.post('/api/admin/careers').send({name:n}).expect(201)).body;
  const user=await account(),student=s.agent();await prisma.student.update({where:{userId:user.id},data:{careerId:Number(career.id)}});await login(student,user);
  const company=s.agent();await login(company,await account('company'));const data={title:'Carrera vinculada',description:'Descripción',area:'Software',slots:1,contactName:'Contacto',contactEmail:'contact@example.com',closingDate:'2027-12-31',careerRecordIds:[career.id],intent:'publish'};
  const o=await company.post('/api/company/opportunities').send(data).expect(201);
  await s.admin.patch(`/api/admin/careers/${career.id}`).send({active:false}).expect(200);
  await s.agent().post('/api/auth/register').send(registration('student',{career:n})).expect(422);
  await student.put('/api/students/profile').send({name:user.name,matricula:user.student.matricula,career:n,careerId:career.id,phone:'6681112233'}).expect(200);
  await company.put(`/api/company/opportunities/${o.body.id}`).send({...data,title:'Otro título',intent:'save'}).expect(200);
  await company.post('/api/company/opportunities').send(data).expect(422);
});
test('renamed_career_preserves_foreign_keys',async()=>{
  const s=await adminContext(),oldName=name(),c=(await s.admin.post('/api/admin/careers').send({name:oldName}).expect(201)).body;const user=await account(),a=s.agent();await prisma.student.update({where:{userId:user.id},data:{careerId:Number(c.id)}});await login(a,user);
  const newName=name();await s.admin.patch(`/api/admin/careers/${c.id}`).send({name:newName}).expect(200);
  const saved=await a.put('/api/students/profile').send({name:user.name,matricula:user.student.matricula,career:oldName,careerId:c.id}).expect(200);
  assert.equal(saved.body.career,newName);assert.equal(saved.body.careerId,c.id);assert.equal((await prisma.student.findUnique({where:{userId:user.id}})).careerId,Number(c.id));
});
