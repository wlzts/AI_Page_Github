import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Camera, RefreshCcw, VideoOff } from 'lucide-react';
import type { Frame } from '../types';
export type CameraHandle={capture:()=>Promise<Blob|null>;restart:()=>Promise<void>};
type Props={lastFrame?:Frame;onionSkin:boolean;onionOpacity:number;onReadyChange?:(r:boolean)=>void};
const CameraPreview=forwardRef<CameraHandle,Props>(({lastFrame,onionSkin,onionOpacity,onReadyChange},ref)=>{const videoRef=useRef<HTMLVideoElement>(null);const streamRef=useRef<MediaStream|null>(null);const [error,setError]=useState('');const [facing,setFacing]=useState<'user'|'environment'>('environment');const [flash,setFlash]=useState(false);const [lastUrl,setLastUrl]=useState<string>();
useEffect(()=>{if(!lastFrame){setLastUrl(undefined);return}const u=URL.createObjectURL(lastFrame.blob);setLastUrl(u);return()=>URL.revokeObjectURL(u)},[lastFrame]);
const stop=()=>{streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null};
const start=async(next=facing)=>{stop();setError('');onReadyChange?.(false);try{const s=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:next},width:{ideal:1920},height:{ideal:1080}},audio:false});streamRef.current=s;if(videoRef.current){videoRef.current.srcObject=s;await videoRef.current.play();onReadyChange?.(true)}}catch(e){setError('Camera access is required to capture stop-motion frames.');onReadyChange?.(false)}};
useEffect(()=>{start();return stop},[]);
useImperativeHandle(ref,()=>({capture:async()=>{const v=videoRef.current;if(!v||v.readyState<2)return null;const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d')!.drawImage(v,0,0);setFlash(true);setTimeout(()=>setFlash(false),120);return await new Promise<Blob|null>(res=>c.toBlob(res,'image/jpeg',.92))},restart:()=>start()}));
const switchCam=async()=>{const n=facing==='environment'?'user':'environment';setFacing(n);await start(n)};
return <div className="relative aspect-video overflow-hidden rounded-2xl bg-black shadow-studio ring-1 ring-white/10">
<video ref={videoRef} playsInline muted className="h-full w-full object-contain bg-black"/>
{onionSkin&&lastUrl&&<img src={lastUrl} className="pointer-events-none absolute inset-0 h-full w-full object-contain" style={{opacity:onionOpacity}}/>}
{flash&&<div className="absolute inset-0 bg-white/70 animate-pulse"/>}
<div className="absolute left-3 top-3 flex gap-2"><span className="rounded-full bg-black/55 px-2.5 py-1 text-xs text-zinc-200 backdrop-blur"><Camera className="mr-1 inline h-3.5 w-3.5"/>Live Camera</span></div>
<button onClick={switchCam} className="absolute right-3 top-3 rounded-xl bg-black/60 p-2.5 text-zinc-100 backdrop-blur hover:bg-black/80" title="Switch camera"><RefreshCcw className="h-4 w-4"/></button>
{error&&<div className="absolute inset-0 grid place-items-center bg-zinc-950/90 p-8 text-center"><div><VideoOff className="mx-auto mb-3 h-9 w-9 text-zinc-500"/><p className="font-medium">{error}</p><p className="mt-2 text-sm text-zinc-400">You can still use Import Images to build an animation.</p><button onClick={()=>start()} className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black">Try camera again</button></div></div>}
</div>});
export default CameraPreview;
