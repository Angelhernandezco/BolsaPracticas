import {test,expect} from '@playwright/test';
import {login,unique} from './fixtures.js';
test('admin_career_lifecycle',async({page,browser})=>{
  await login(page,'e2e-admin@example.com');await page.goto('/admin/carreras');await page.getByRole('button',{name:'Nueva carrera',exact:true}).click();const name=`Carrera ${unique()}`;await page.getByRole('dialog').getByLabel('Nombre de la carrera').fill(name);await page.getByRole('button',{name:'Crear carrera',exact:true}).click();const row=page.locator('.career-row').filter({hasText:name});await expect(row).toBeVisible();await row.getByRole('button',{name:'Editar nombre'}).click();const renamed=`Renombrada ${unique()}`;await page.getByRole('dialog').getByLabel('Nombre de la carrera').fill(renamed);await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();const updated=page.locator('.career-row').filter({hasText:renamed});await updated.getByRole('button',{name:'Desactivar',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Confirmar desactivación'}).click();await expect(updated).toContainText('Inactivo');
  const context=await browser.newContext(),registration=await context.newPage();await registration.goto('http://localhost:8444/registro');await expect(registration.getByRole('combobox').getByRole('option',{name:renamed,exact:true})).toHaveCount(0);await updated.getByRole('button',{name:'Reactivar',exact:true}).click();await expect(updated).toContainText('Activo');await registration.reload();await expect(registration.getByRole('combobox').getByRole('option',{name:renamed,exact:true})).toHaveCount(1);await context.close();
});
test('existing_inactive_selection_is_visible_and_preserved',async({page,browser})=>{
  await login(page,'e2e-admin@example.com');const name=`Selección ${unique()}`;await page.request.post('/api/admin/careers',{data:{name}});
  const context=await browser.newContext(),student=await context.newPage();await login(student);await student.goto('/estudiante/perfil');await student.getByRole('combobox').selectOption({label:name});await student.getByRole('button',{name:'Guardar cambios'}).click();await expect(student.getByText('Tu perfil se actualizó correctamente.')).toBeVisible();
  const all=await(await page.request.get('/api/admin/careers')).json();const id=all.find(c=>c.name===name).id;await page.request.patch(`/api/admin/careers/${id}`,{data:{active:false}});await student.reload();await expect(student.getByRole('combobox').locator('option:checked')).toContainText('Inactiva');await student.getByLabel('Teléfono',{exact:true}).fill('6681234567');await student.getByRole('button',{name:'Guardar cambios'}).click();await expect(student.getByText('Tu perfil se actualizó correctamente.')).toBeVisible();await page.request.patch(`/api/admin/careers/${id}`,{data:{active:true}});await context.close();
});
test('non_admin_career_route_denied',async({page})=>{await login(page);await page.goto('/admin/carreras');await expect(page).toHaveURL(/estudiante$/);});

test('open_opportunity_form_keeps_id_after_admin_rename_and_deactivation',async({page,browser})=>{
  await login(page,'e2e-admin@example.com');const name=`Vínculo ${unique()}`,created=await page.request.post('/api/admin/careers',{data:{name}});const career=await created.json();
  const context=await browser.newContext(),company=await context.newPage();await login(company,'e2e-company@example.com');
  const response=await company.request.post('/api/company/opportunities',{data:{title:`Convocatoria ${unique()}`,intent:'draft',careerRecordIds:[career.id]}});expect(response.status()).toBe(201);const opportunity=await response.json();
  await company.goto(`/empresa/convocatorias/${opportunity.id}/editar`);await expect(company.getByRole('checkbox',{name,exact:true})).toBeChecked();
  const renamed=`Actualizada ${unique()}`;await page.request.patch(`/api/admin/careers/${career.id}`,{data:{name:renamed,active:false}});
  await company.getByLabel('Título de la convocatoria').fill('Otro título, mismo vínculo');await company.getByRole('button',{name:'Guardar borrador',exact:true}).click();
  const saved=await (await company.request.get(`/api/opportunities/${opportunity.id}`)).json();expect(saved.careerAssociations).toContainEqual({id:career.id,name:renamed,active:false});
  await company.goto(`/empresa/convocatorias/${opportunity.id}/editar`);await expect(company.getByRole('checkbox',{name:`${renamed} (Inactiva)`,exact:true})).toBeChecked();await context.close();
});

for(const width of [375,1366])test(`career_and_company_layout_${width}`,async({page},testInfo)=>{
  await page.setViewportSize({width,height:667});await login(page,'e2e-admin@example.com');await page.goto('/admin/carreras');await page.getByRole('button',{name:'Nueva carrera',exact:true}).click();await expect(page.getByRole('dialog').getByRole('button',{name:'Crear carrera',exact:true})).toBeInViewport();await page.screenshot({path:testInfo.outputPath('careers.png')});await page.getByRole('button',{name:'Cancelar',exact:true}).click();
  await page.goto('/admin/empresas');await page.getByLabel('Buscar empresa').fill('Empresa E2E');await expect(page.locator('.agreement-companies-table')).toBeVisible();await page.screenshot({path:testInfo.outputPath('companies.png'),fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
});
