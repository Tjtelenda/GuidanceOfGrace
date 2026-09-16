import fs from 'node:fs';
import path from 'node:path';
import { KnowledgeUpdater } from '../desktop/knowledge-updater.js';
import { buildLocalCatalog } from '../desktop/local-generator.js';
const [sourceDir,userData,gameVersion]=process.argv.slice(2);
if(!sourceDir||!userData||!gameVersion)throw Error('Arguments: generated-data-directory companion-user-data-directory game-version');
const value=buildLocalCatalog(sourceDir,gameVersion),temp=path.join(sourceDir,'grace-catalog.json');fs.writeFileSync(temp,JSON.stringify(value));
console.log(new KnowledgeUpdater(userData).importMarkers(temp));
console.log(value.records.reduce((counts,r)=>(counts[r.type]=(counts[r.type]??0)+1,counts),{}));
