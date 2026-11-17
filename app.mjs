import {encodePixels,decodePixels,random} from './codec.mjs';
const $=id=>document.getElementById(id);
const message=$('message'),status=$('status');
let currentURL=null,currentBlob=null,busy=false,operation=0;
function say(text=''){status.textContent=text;}
function setBusy(value){busy=value;$('generate').disabled=value||!message.value.trim();$('upload').disabled=value;$('again').disabled=value;message.disabled=value;}
function clearPicture(){if(currentURL)URL.revokeObjectURL(currentURL);currentURL=null;currentBlob=null;$('picture').hidden=true;document.body.classList.remove('has-image');$('share').hidden=true;}
function draw(seed){
  const r=random(seed),c=document.createElement('canvas');c.width=1024;c.height=1280;const ctx=c.getContext('2d',{willReadFrequently:true});
  const themes=[['#777a9b','#cfabb4','#f1c8ac','#8e8fa7','#555f7d'],['#8c9baa','#ccc4c6','#efcebd','#9aa5ae','#62798c'],['#81839a','#cab3be','#efcbb9','#9996ac','#696c8c']];
  const colors=themes[Math.floor(r()*themes.length)],horizon=760+r()*80;
  const sky=ctx.createLinearGradient(0,0,0,horizon);sky.addColorStop(0,colors[0]);sky.addColorStop(.65,colors[1]);sky.addColorStop(1,colors[2]);ctx.fillStyle=sky;ctx.fillRect(0,0,1024,1280);
  const mx=310+r()*400,my=300+r()*130,mr=44+r()*22;
  const halo=ctx.createRadialGradient(mx,my,mr*.2,mx,my,mr*4);halo.addColorStop(0,'#fff4df44');halo.addColorStop(1,'#fff4df00');ctx.fillStyle=halo;ctx.fillRect(0,0,1024,horizon);
  ctx.fillStyle='#fff1d8';ctx.beginPath();ctx.arc(mx,my,mr,0,Math.PI*2);ctx.fill();
  for(let i=0;i<65;i++){const x=r()*1024,y=r()*horizon*.68;ctx.fillStyle=`rgba(255,244,226,${.12+r()*.46})`;ctx.beginPath();ctx.arc(x,y,.5+r()*1.25,0,Math.PI*2);ctx.fill();}
  for(let i=0;i<12;i++){const y=160+r()*500,x=r()*1024;const g=ctx.createRadialGradient(x,y,0,x,y,250+r()*300);g.addColorStop(0,'#ffe9de0b');g.addColorStop(1,'#ffe9de00');ctx.save();ctx.translate(0,y);ctx.scale(1,.12);ctx.fillStyle=g;ctx.fillRect(0,-6000,1024,12000);ctx.restore();}
  const sea=ctx.createLinearGradient(0,horizon,0,1280);sea.addColorStop(0,colors[3]);sea.addColorStop(1,colors[4]);ctx.fillStyle=sea;ctx.fillRect(0,horizon,1024,1280-horizon);
  ctx.fillStyle='#fce0cd55';ctx.fillRect(0,horizon,1024,1);
  for(let i=0;i<1700;i++){const depth=r(),y=horizon+depth*(1280-horizon),x=r()*1024,w=3+r()*45*(.2+depth);ctx.strokeStyle=`rgba(239,214,203,${.025+r()*.08})`;ctx.lineWidth=.5+r();ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+w,y);ctx.stroke();}
  for(let i=0;i<780;i++){const d=r(),y=horizon+d*(1280-horizon),spread=12+d*170,x=mx+(r()+r()+r()-1.5)*spread;ctx.strokeStyle=`rgba(255,230,194,${(.03+r()*.25)*(1-d*.65)})`;ctx.lineWidth=.7+r()*1.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+2+r()*(8+d*20),y);ctx.stroke();}
  // Fine opaque grain keeps exported pixels stable across browsers.
  const data=ctx.getImageData(0,0,c.width,c.height);
  for(let i=0;i<data.data.length;i+=4){const n=(r()-.5)*5;for(let k=0;k<3;k++)data.data[i+k]+=n;data.data[i+3]=255;}
  ctx.putImageData(data,0,0);return c;
}
async function generate(){
  if(busy||!message.value.trim())return;
  const text=message.value,token=++operation;setBusy(true);say();
  try{
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const seed=crypto.getRandomValues(new Uint32Array(1))[0],canvas=draw(seed),ctx=canvas.getContext('2d');
    const data=ctx.getImageData(0,0,canvas.width,canvas.height);encodePixels(data.data,text,seed);ctx.putImageData(data,0,0);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw new Error('未能生成图片，请重试。');if(token!==operation)return;
    clearPicture();currentBlob=blob;currentURL=URL.createObjectURL(blob);$('art').src=currentURL;$('download').href=currentURL;$('picture').hidden=false;document.body.classList.add('has-image');
    $('share').hidden=!navigator.canShare?.({files:[new File([blob],'moon-letter.png',{type:'image/png'})]});
  }catch(error){say(error.message||'未能生成图片，请重试。');}finally{setBusy(false);}
}
async function read(file){
  if(!file||busy)return;
  ++operation;setBusy(true);say();
  try{
    if(file.size>20*1024*1024)throw new Error('请选择小于 20 MB 的 PNG 原图。');
    const header=new Uint8Array(await file.slice(0,24).arrayBuffer());
    if(header.length<24||![137,80,78,71,13,10,26,10].every((v,i)=>header[i]===v))throw new Error('请上传 PNG 原图。');
    const view=new DataView(header.buffer),w=view.getUint32(16),h=view.getUint32(20);
    if(w!==1024||h!==1280)throw new Error('图片尺寸发生了变化，请上传本站生成的 PNG 原图。');
    const url=URL.createObjectURL(file),img=new Image();
    try{img.src=url;await img.decode();const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);const result=decodePixels(ctx.getImageData(0,0,w,h).data);clearPicture();message.value=result;message.readOnly=true;message.setAttribute('aria-label','从图片读出的密语');$('copy').hidden=false;$('reset').hidden=false;$('generate').hidden=true;message.style.height='auto';message.style.height=Math.min(message.scrollHeight,330)+'px';}
    finally{URL.revokeObjectURL(url);}
  }catch(error){say(error.message||'无法读取这张图片，请重新选择原图。');}finally{setBusy(false);$('file').value='';}
}
$('generate').addEventListener('click',generate);$('again').addEventListener('click',generate);
message.addEventListener('input',()=>{say();clearPicture();$('generate').disabled=!message.value.trim();});
message.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key==='Enter'&&!message.readOnly){e.preventDefault();generate();}});
$('upload').addEventListener('click',()=>$('file').click());$('file').addEventListener('change',e=>read(e.target.files[0]));
$('reset').addEventListener('click',()=>{clearPicture();say();message.value='';message.readOnly=false;message.style.height='';message.setAttribute('aria-label','输入想藏在画里的话');$('copy').hidden=true;$('reset').hidden=true;$('generate').hidden=false;$('generate').disabled=true;message.focus();});
$('copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(message.value);say('已复制。');}catch{message.focus();message.select();say('请长按或使用复制快捷键。');}});
$('share').addEventListener('click',async()=>{try{if(currentBlob)await navigator.share({files:[new File([currentBlob],'moon-letter.png',{type:'image/png'})]});}catch(e){if(e.name!=='AbortError')say('请使用下载按钮保存原图。');}});
let dragDepth=0;
document.addEventListener('dragenter',e=>{if([...e.dataTransfer.types].includes('Files')){e.preventDefault();dragDepth++;document.body.classList.add('dragging');}});
document.addEventListener('dragover',e=>e.preventDefault());document.addEventListener('dragleave',()=>{if(--dragDepth<=0)document.body.classList.remove('dragging');});
document.addEventListener('drop',e=>{e.preventDefault();dragDepth=0;document.body.classList.remove('dragging');read(e.dataTransfer.files[0]);});
