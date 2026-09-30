import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { encodeWav, physicalLibrary, physicalOrder, renderProgram, validateProgram, type SoundProgram } from '../src/engine/index.ts';
const args=process.argv.slice(2);
const opt=(name:string)=>{const i=args.indexOf(name);if(i<0)return undefined;const v=args[i+1];args.splice(i,2);return v};
const out=opt('--out')??'renders',variantsArg=opt('--variants'),srArg=opt('--sr'),all=args.includes('--library'),targets=all?[...physicalOrder]:args.filter(a=>!a.startsWith('--'));
if(!targets.length){console.log('usage: npm run render -- [--library | <id|file.json> ...] [--out dir] [--variants n] [--sr 44100]');console.log('library ids: '+physicalOrder.join(', '));process.exit(1)}
mkdirSync(out,{recursive:true});const slug=(s:string)=>s.replace(/\.resona\.json$|\.json$/i,'');
for(const t of targets){let prog:SoundProgram,id:string;if(t in physicalLibrary){prog=(physicalLibrary as Record<string,SoundProgram>)[t];id=t}else{const raw=JSON.parse(readFileSync(t,'utf8'));prog=validateProgram(raw.sound??raw);id=slug(basename(t))}const n=variantsArg?Math.max(1,+variantsArg):prog.variants??1,t0=Date.now();for(let v=0;v<n;v++){const r=renderProgram(prog,{variant:v,sampleRate:srArg?+srArg:undefined});writeFileSync(join(out,`${id}_${v}.wav`),encodeWav(r.data,r.sampleRate))}console.log(`${id.padEnd(10)} ×${n}  ${Date.now()-t0}ms`)}
