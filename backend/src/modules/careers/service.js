import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { invalid } from '../../lib/errors.js';
import { parseId } from '../../lib/ids.js';
export const serializeCareer=career=>({id:String(career.id),name:career.name,active:career.active});
const name=z.string().trim().min(1,'Ingresa el nombre de la carrera.').max(120);
export async function selectCareers(tx,{ids,names=[],existingIds=[]}) {
  const criteria=ids?{id:{in:[...new Set(ids.map(parseId))]}}:{name:{in:[...new Set(names)]}};
  const expected=ids?new Set(ids.map(String)).size:new Set(names).size;
  const initial=await tx.career.findMany({where:criteria});
  if(initial.length!==expected)throw invalid('Selecciona carreras válidas. Actualiza el catálogo si hubo cambios.');
  if(!initial.length)return [];
  const ordered=initial.map(c=>c.id).sort((a,b)=>a-b);
  await tx.$queryRaw`SELECT id_carrera FROM carrera WHERE id_carrera IN (${Prisma.join(ordered)}) ORDER BY id_carrera FOR SHARE`;
  const rows=await tx.career.findMany({where:{id:{in:ordered}}});
  if(rows.some(c=>!c.active&&!existingIds.includes(c.id)))throw invalid('La carrera seleccionada está inactiva.');
  return rows;
}
export function careersService({prisma}) {return {
  async list(){return (await prisma.career.findMany({orderBy:{name:'asc'}})).map(serializeCareer);},
  async create(input){const data=z.object({name}).parse(input);return serializeCareer(await prisma.career.create({data}));},
  async update(id,input){const data=z.object({name:name.optional(),active:z.boolean().optional()}).refine(d=>d.name!==undefined||d.active!==undefined,'Indica el cambio que deseas guardar.').parse(input);return serializeCareer(await prisma.career.update({where:{id},data}));}
};}
