import { spawnSync } from 'node:child_process';

const root=new URL('..',import.meta.url), savePath=process.argv[2];
const tests=[...(savePath?[['test-save-parser.mjs',savePath]]:[]),['test-data.mjs'],['test-content.mjs'],['test-desktop-core.mjs'],['test-static.mjs']];
for(const [file,arg] of tests){
  const args=[new URL(`./tests/${file}`,root).pathname];
  if(arg)args.push(arg);
  const result=spawnSync(process.execPath,args,{stdio:'inherit'});
  if(result.status!==0)process.exit(result.status??1);
}
