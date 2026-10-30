import { mkdir,writeFile,unlink } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
export function localStorage(directory) {
  function filename(key) {if(!/^[a-f0-9-]{36}$/.test(key))throw new Error('INVALID_STORAGE_KEY');return path.join(directory,key);}
  return {
    async put({key,buffer}){const target=filename(key);await mkdir(directory,{recursive:true});await writeFile(target,buffer,{flag:'wx'});},
    async get({key}){return {stream:createReadStream(filename(key))};},
    async delete({key}){await unlink(filename(key)).catch(e=>{if(e.code!=='ENOENT')throw e;});}
  };
}
