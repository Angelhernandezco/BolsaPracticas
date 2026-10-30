import {test,expect} from '@playwright/test';
import {login,unique,password,verificationUrl} from './fixtures.js';
import {readFile} from 'node:fs/promises';
async function createCompany(page){const id=unique(),email=`agreement-${id}@example.com`;const res=await page.request.post('/api/auth/register',{data:{role:'company',name:`Convenio ${id}`,email,password,rfc:`CVA${id.slice(-9)}`,giro:'Servicios',address:'Dirección de prueba'}});expect(res.status()).toBe(201);const user=await res.json();await page.request.post('/api/auth/email/verify',{data:{token:new URL(await verificationUrl(email)).searchParams.get('token')}});await page.request.post('/api/auth/logout');return user;}
test('three_columns_optional_dates_and_validation',async({page})=>{
  const user=await createCompany(page);await login(page,'e2e-admin@example.com');await page.goto('/admin/empresas');await page.getByLabel('Buscar empresa').fill(user.name);const table=page.locator('.agreement-companies-table');for(const label of ['Inicio de convenio','Fin de convenio','Estado del convenio'])await expect(table.locator('.table-head')).toContainText(label);const row=table.locator('.table-row').filter({hasText:user.name});await expect(row).toContainText('Sin convenio');await expect(row.getByRole('checkbox')).toHaveCount(0);await row.getByRole('button',{name:'Editar convenio'}).click();const modal=page.getByRole('dialog');await modal.getByLabel('Fecha inicial del convenio',{exact:true}).fill('2026-10-01');await modal.getByRole('button',{name:'Guardar convenio',exact:true}).click();await expect(modal.getByText(/Completa ambas fechas/)).toBeVisible();await modal.getByLabel('Fecha final del convenio',{exact:true}).fill('2026-10-31');await modal.getByRole('button',{name:'Guardar convenio',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('browser_timezone_determines_agreement_state',async({page,browser})=>{
  const user=await createCompany(page);await login(page,'e2e-admin@example.com');await page.request.patch(`/api/admin/companies/${user.id}/uas-agreement`,{data:{agreementStartDate:'2026-10-29',agreementEndDate:'2026-10-29'}});
  for(const [timezoneId,label] of [['America/Los_Angeles','Activo'],['Asia/Tokyo','Vencido']]){const context=await browser.newContext({timezoneId}),p=await context.newPage();await p.clock.install({time:new Date('2026-10-30T00:30:00Z')});await login(p,'e2e-admin@example.com');await p.goto('/admin/empresas');await p.getByLabel('Buscar empresa').fill(user.name);await expect(p.locator('.agreement-companies-table .table-row').filter({hasText:user.name}).getByText(label,{exact:true})).toBeVisible();await context.close();}
});
test('last_day_inclusive_and_midnight_refresh',async({page,browser})=>{
  const user=await createCompany(page);await login(page,'e2e-admin@example.com');await page.request.patch(`/api/admin/companies/${user.id}/uas-agreement`,{data:{agreementStartDate:'2026-10-01',agreementEndDate:'2026-10-29'}});
  const context=await browser.newContext({timezoneId:'America/Mazatlan'}),p=await context.newPage();await p.clock.install({time:new Date('2026-10-30T06:59:00Z')});await login(p,'e2e-admin@example.com');await p.goto('/admin/empresas');await p.getByLabel('Buscar empresa').fill(user.name);const row=p.locator('.agreement-companies-table .table-row').filter({hasText:user.name});await expect(row.getByText('Activo',{exact:true})).toBeVisible();await p.clock.fastForward(61000);await expect(row.getByText('Vencido',{exact:true})).toBeVisible();await context.close();
});

test('approval_captures_email_and_admin_can_retry_failed_notice',async({page})=>{
  const user=await createCompany(page);await login(page,'e2e-admin@example.com');
  const approved=await page.request.post(`/api/admin/companies/${user.id}/decision`,{data:{decision:'approved',agreementStartDate:'2026-10-01',agreementEndDate:'2026-10-31'}});expect(approved.status()).toBe(200);
  expect((await approved.json()).approvalNotification.status).toBe('sent');
  const messages=(await readFile('backend/storage-test/e2e-outbox.jsonl','utf8')).trim().split('\n').map(JSON.parse);
  expect(messages.filter(m=>m.to===user.email&&m.type==='approval')).toMatchObject([{agreementStartDate:'2026-10-01',agreementEndDate:'2026-10-31'}]);
  await page.route('**/api/admin/companies',async route=>{const response=await route.fetch();const companies=await response.json();await route.fulfill({response,json:companies.map(company=>company.id===user.id?{...company,approvalNotification:{status:'failed',sentAt:null}}:company)});});
  await page.goto('/admin/empresas');await page.getByLabel('Buscar empresa').fill(user.name);await page.locator('.company-open-button').filter({hasText:user.name}).click();
  const dialog=page.getByRole('dialog');await expect(dialog.getByText('No se pudo enviar el correo de aprobación.')).toBeVisible();await dialog.getByRole('button',{name:'Reintentar correo'}).click();await expect(dialog.getByText('Correo de aprobación enviado.')).toBeVisible();await expect(dialog.getByRole('button',{name:'Reintentar correo'})).toHaveCount(0);
});
