export type Waveform = 'sine' | 'square' | 'sawtooth' | 'triangle' | 'noise';
export type SoundDefinition = {
  name:string; waveform:Waveform; frequency:number; duration:number; gain:number;
  attack:number; decay:number; sustain:number; release:number; filterFrequency:number; filterQ:number;
};
export const defaultSound:SoundDefinition={name:'Neon Confirm',waveform:'sawtooth',frequency:440,duration:.85,gain:.28,attack:.01,decay:.18,sustain:.42,release:.3,filterFrequency:2400,filterQ:4};

function env(g:AudioParam,start:number,d:SoundDefinition){
 const a=start+Math.max(.001,d.attack), de=a+Math.max(.001,d.decay), e=start+d.duration, s=Math.max(de,e-d.release);
 g.cancelScheduledValues(start); g.setValueAtTime(.0001,start); g.exponentialRampToValueAtTime(Math.max(.0001,d.gain),a);
 g.exponentialRampToValueAtTime(Math.max(.0001,d.gain*d.sustain),de); g.setValueAtTime(Math.max(.0001,d.gain*d.sustain),s); g.exponentialRampToValueAtTime(.0001,e);
}
function noiseBuffer(ctx:BaseAudioContext,duration:number){
 const b=ctx.createBuffer(1,Math.ceil(ctx.sampleRate*(duration+.05)),ctx.sampleRate), x=b.getChannelData(0);
 for(let i=0;i<x.length;i++) x[i]=Math.random()*2-1; return b;
}
function wire(ctx:BaseAudioContext,d:SoundDefinition,destination:AudioNode,start:number){
 const filter=ctx.createBiquadFilter(), amp=ctx.createGain(); filter.type='lowpass'; filter.frequency.value=d.filterFrequency; filter.Q.value=d.filterQ; env(amp.gain,start,d); filter.connect(amp); amp.connect(destination);
 if(d.waveform==='noise'){ const src=ctx.createBufferSource(); src.buffer=noiseBuffer(ctx,d.duration); src.connect(filter); src.start(start); src.stop(start+d.duration+.02); return; }
 const osc=ctx.createOscillator(); osc.type=d.waveform; osc.frequency.value=d.frequency; osc.connect(filter); osc.start(start); osc.stop(start+d.duration+.02);
}
export function playSound(ctx:AudioContext,d:SoundDefinition,analyser?:AnalyserNode){ if(analyser){ analyser.disconnect(); analyser.connect(ctx.destination); wire(ctx,d,analyser,ctx.currentTime); } else wire(ctx,d,ctx.destination,ctx.currentTime); }
export async function renderSound(d:SoundDefinition){ const sr=48000, ctx=new OfflineAudioContext(1,Math.ceil(sr*(d.duration+.05)),sr); wire(ctx,d,ctx.destination,0); return ctx.startRendering(); }
function ascii(v:DataView,o:number,s:string){for(let i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i));}
export function audioBufferToWav(b:AudioBuffer){const c=b.numberOfChannels,sr=b.sampleRate,f=b.length,ba=c*2,ds=f*ba,ab=new ArrayBuffer(44+ds),v=new DataView(ab);ascii(v,0,'RIFF');v.setUint32(4,36+ds,true);ascii(v,8,'WAVE');ascii(v,12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,c,true);v.setUint32(24,sr,true);v.setUint32(28,sr*ba,true);v.setUint16(32,ba,true);v.setUint16(34,16,true);ascii(v,36,'data');v.setUint32(40,ds,true);let o=44;for(let i=0;i<f;i++)for(let ch=0;ch<c;ch++){const s=Math.max(-1,Math.min(1,b.getChannelData(ch)[i]));v.setInt16(o,s<0?s*0x8000:s*0x7fff,true);o+=2;}return new Blob([ab],{type:'audio/wav'});}
export async function exportWav(d:SoundDefinition){const b=await renderSound(d),u=URL.createObjectURL(audioBufferToWav(b)),a=document.createElement('a');a.href=u;a.download=`${d.name.toLowerCase().replace(/[^a-z0-9]+/g,'-')||'resona-sound'}.wav`;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
