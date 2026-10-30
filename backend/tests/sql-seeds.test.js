import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdtemp,readFile,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import bcrypt from 'bcrypt';
import request from 'supertest';
import {createApp} from '../src/app.js';
import {loadConfig} from '../src/config.js';
import {createStorage} from '../src/services/storage/index.js';
import {PrismaClient} from '@prisma/client';
import {assertTestDatabase,backendRoot} from '../src/config.js';

async function schemaDb(){
  assertTestDatabase(process.env.DATABASE_URL,'postgresql://localhost/bolsa_practicas');
  const url=new URL(process.env.DATABASE_URL),schema=`sql_${randomUUID().replaceAll('-','')}`;
  url.searchParams.set('schema',schema);
  const db=new PrismaClient({datasourceUrl:url.toString()});
  await db.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  return {db,url,schema};
}
async function snapshot(db){
  const users=await db.user.findMany({orderBy:{email:'asc'},include:{student:{include:{career:true,cv:true}},company:true}});
  return {careers:await db.career.findMany({orderBy:{seedKey:'asc'},select:{seedKey:true,name:true,active:true}}),users:users.map(u=>({email:u.email,name:u.name,roleId:u.roleId,verified:u.emailVerified,student:u.student&&{matricula:u.student.matricula,career:u.student.career.seedKey,cv:u.student.cv?.key},company:u.company&&{rfc:u.company.rfc,start:u.company.agreementStartDate,end:u.company.agreementEndDate,status:u.company.approvalStatus}})),opportunities:await db.opportunity.findMany({orderBy:{title:'asc'},select:{title:true,status:true,closingDate:true,careers:{select:{career:{select:{seedKey:true}}},orderBy:{careerId:'asc'}}}}),applications:await db.application.findMany({orderBy:{id:'asc'},select:{opportunityTitle:true,companyName:true,status:true,student:{select:{user:{select:{email:true}}}}}})};
}
test('sql_and_javascript_seed_same_fixed_scenarios',async()=>{
  const {loadSeedData,seedCatalogs,seedDemo}=await import('../prisma/seed-data.js');
  const {renderInstallSql}=await import('../scripts/generate-install-sql.js');
  const a=await schemaDb(),b=await schemaDb(),manifest=loadSeedData(),referenceDate='2026-10-29';
  try{
    const sql=await renderInstallSql(manifest,{referenceDate});
    const install=(target)=>{const connection=new URL(target.url);connection.searchParams.delete('schema');const result=spawnSync('C:/Program Files/PostgreSQL/18/bin/psql.exe',['-X','-v','ON_ERROR_STOP=1','-q'],{input:`SET search_path TO "${target.schema}";\n${sql}`,env:{...process.env,PGHOST:connection.hostname,PGPORT:connection.port,PGUSER:decodeURIComponent(connection.username),PGPASSWORD:decodeURIComponent(connection.password),PGDATABASE:connection.pathname.slice(1)},encoding:'utf8'});assert.equal(result.status,0,result.stderr);};
    install(a);install(b);
    // Recreate a separate migrated JS target without seeded SQL rows.
    const c=await schemaDb();try{
      const migrated=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{cwd:backendRoot,env:{...process.env,DATABASE_URL:c.url.toString()},encoding:'utf8'});assert.equal(migrated.status,0,migrated.stderr);
      await seedCatalogs(c.db,manifest);await seedDemo(c.db,manifest,{referenceDate});assert.deepEqual(await snapshot(a.db),await snapshot(c.db));
      const drift=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','diff','--from-url',a.url.toString(),'--to-schema-datamodel','prisma/schema.prisma','--exit-code'],{cwd:backendRoot,env:{...process.env,DATABASE_URL:a.url.toString()},encoding:'utf8'});assert.equal(drift.status,0,drift.stdout+drift.stderr);
      assert.equal(await a.db.session.count(),0);assert.equal(await a.db.verification.count(),0);
      for(const user of await a.db.user.findMany())assert.ok(await bcrypt.compare(manifest.passwords[user.email.startsWith('e2e-')?'e2e':'demo'].plain,user.passwordHash));
      const career=await c.db.career.findUniqueOrThrow({where:{seedKey:'software'}});await c.db.career.update({where:{id:career.id},data:{name:'Software renombrado',active:false}});await seedCatalogs(c.db,manifest);assert.equal(await c.db.career.count({where:{name:career.name}}),0);assert.equal((await c.db.career.findUniqueOrThrow({where:{id:career.id}})).active,false);
    }finally{await c.db.$disconnect();}
  }finally{await a.db.$disconnect();await b.db.$disconnect();}
});
test('sql_demo_cv_bytes_are_prepared_without_overwriting_existing_files',async()=>{
  const {loadSeedData,seedCatalogs,seedDemo}=await import('../prisma/seed-data.js');const {prepareDemoAssets}=await import('../scripts/prepare-demo-assets.js');const {localStorage}=await import('../src/services/storage/local.js');
  const target=await schemaDb(),directory=await mkdtemp(path.join(tmpdir(),'demo-assets-'));try{
    const migrated=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{cwd:backendRoot,env:{...process.env,DATABASE_URL:target.url.toString()},encoding:'utf8'});assert.equal(migrated.status,0,migrated.stderr);
    const manifest=loadSeedData();await seedCatalogs(target.db,manifest);await seedDemo(target.db,manifest,{referenceDate:'2026-10-29'});const storage=localStorage(directory);await prepareDemoAssets(target.db,storage,manifest);const file=await target.db.storedFile.findFirstOrThrow();const filename=path.join(directory,file.key),before=await stat(filename);await prepareDemoAssets(target.db,storage,manifest);assert.equal((await stat(filename)).mtimeMs,before.mtimeMs);assert.ok((await readFile(filename)).subarray(0,5).equals(Buffer.from('%PDF-')));
    const config={...loadConfig(process.env),storageDir:directory},app=createApp({prisma:target.db,config,storage:createStorage(config)});
    for(const email of ['mariana.lopez@uas.edu','empresa@demo.mx']){const agent=request.agent(app);await agent.post('/api/auth/login').send({email,password:'Demo1234'}).expect(200);await agent.get(`/api/files/${file.id}`).expect('Content-Type',/pdf/).expect(200);}
  }finally{await target.db.$disconnect();}
});
