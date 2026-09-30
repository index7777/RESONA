import{defaultSound,type Layer,type SoundDefinition}from'./audio';
export type ArchetypeId='confirm'|'error'|'notification'|'click'|'laser'|'impact'|'explosion'|'whoosh'|'power-up'|'power-down'|'alarm'|'glitch'|'drone'|'ambient';
const L=(id:string,w:Layer['waveform'],frequency:number,gain:number,pitchDrop=0):Layer=>({id,waveform:w,frequency,detune:0,gain,pitchDrop,filterFrequency:12000,filterQ:.7,fmAmount:0,fmRatio:2});
const S=(name:string,duration:number,filterFrequency:number,layers:Layer[],x:Partial<SoundDefinition>={}):SoundDefinition=>({...defaultSound,name,duration,filterFrequency,layers,...x});
export const soundLibrary:Record<ArchetypeId,SoundDefinition>={
confirm:S('Confirm',.42,6500,[L('tone','sine',660,.14),L('shine','sine',990,.075,160)],{delay:.08}),
error:S('Error',.58,3000,[L('low','square',220,.13,30),L('tone','sawtooth',330,.08,80)],{distortion:7}),
notification:S('Notification',.72,7600,[L('bell','sine',740,.12),{...L('chime','sine',1110,.07),fmAmount:24,fmRatio:2}],{delay:.16}),
click:S('Click',.12,8500,[L('tick','square',1200,.055,700),L('body','noise',100,.025)],{attack:.001,decay:.035,sustain:.05,release:.04}),
laser:S('Laser',.5,7200,[{...L('beam','sawtooth',1450,.16,1180),fmAmount:35,fmRatio:2},{...L('spark','square',1900,.05,1350),detune:9}],{filterQ:7,delay:.18,distortion:10}),
impact:S('Impact',.8,2200,[L('body','noise',100,.26),L('sub','sine',105,.26,55),L('crack','square',620,.055,380)],{distortion:14}),
explosion:S('Explosion',1.35,1800,[L('blast','noise',100,.36),L('sub','sine',82,.3,45),L('debris','square',480,.06,300)],{distortion:24,delay:.05}),
whoosh:S('Whoosh',.9,6500,[L('air','noise',100,.22),{...L('motion','sine',180,.07),pitchEnvelope:{attack:.08,decay:.5,amount:900}}],{attack:.08,release:.28}),
'power-up':S('Power Up',1.15,8000,[{...L('rise','sawtooth',180,.11),pitchEnvelope:{attack:.08,decay:.75,amount:1200}},{...L('glow','sine',720,.065),fmAmount:45,fmRatio:2}],{delay:.18}),
'power-down':S('Power Down',1.05,5200,[L('fall','sawtooth',900,.11,720),L('sub','sine',240,.07,160)],{delay:.12}),
alarm:S('Alarm',1.2,6000,[{...L('alarm','square',620,.11),lfo:{waveform:'sine',rate:5,target:'pitch',pitchDepthCents:180,filterDepthHz:0,gainDepth:0}},L('body','sine',310,.07)]),
glitch:S('Glitch',.34,9000,[{...L('digital','square',1500,.075,1100),fmAmount:180,fmRatio:3},L('noise','noise',100,.055)],{distortion:20,filterQ:5}),
drone:S('Drone',2.8,3800,[{...L('root','sine',110,.1),lfo:{waveform:'sine',rate:.3,target:'pitch',pitchDepthCents:12,filterDepthHz:0,gainDepth:0}},L('fifth','triangle',165,.055)],{attack:.3,release:.8,delay:.2}),
ambient:S('Ambient',3.2,4600,[{...L('bed','triangle',130,.075),lfo:{waveform:'sine',rate:.22,target:'filter',pitchDepthCents:0,filterDepthHz:700,gainDepth:0}},L('air','noise',100,.03)],{attack:.4,release:1,delay:.28})
};
export const libraryOrder:ArchetypeId[]=['confirm','error','notification','click','laser','impact','explosion','whoosh','power-up','power-down','alarm','glitch','drone','ambient'];
export function cloneArchetype(id:ArchetypeId):SoundDefinition{return structuredClone(soundLibrary[id])}
