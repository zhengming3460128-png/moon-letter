const MAGIC = [77, 76, 84, 49];
export const MAX_BYTES = 8192;
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) { c ^= b; for (let k=0;k<8;k++) c = (c>>>1) ^ ((c&1)?0xedb88320:0); }
  return (c ^ 0xffffffff) >>> 0;
}
export function random(seed) {
  let state = seed >>> 0;
  return () => { state = (state + 0x6d2b79f5) >>> 0; let t=state; t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296; };
}
function position(bit, length) { const channel=(bit*7919+104729) % (length/4*3);return Math.floor(channel/3)*4+channel%3; }
export function encodePixels(pixels, message, seed) {
  const bytes=new TextEncoder().encode(message);
  if (!message.trim()) throw new Error('先写下一句话。');
  if (bytes.length>MAX_BYTES) throw new Error('这句话太长了，请缩短一些。');
  const payload=new Uint8Array(16+bytes.length), view=new DataView(payload.buffer);
  payload.set(MAGIC);view.setUint32(4,bytes.length);view.setUint32(8,seed);view.setUint32(12,crc32(bytes));
  const rng=random(seed ^ 0x4d6f6f6e);
  for(let i=0;i<bytes.length;i++) payload[16+i]=bytes[i]^Math.floor(rng()*256);
  if(payload.length*8>pixels.length/4*3) throw new Error('图片太小。');
  for(let i=0;i<payload.length*8;i++){const p=position(i,pixels.length);pixels[p]=(pixels[p]&254)|((payload[i>>>3] >>> (7-i%8))&1);}
  return pixels;
}
export function decodePixels(pixels) {
  const fail=()=>{throw new Error('没有读到完整的密语，请上传本站生成的 PNG 原图。');};
  if(pixels.length<1024) return fail();
  const read=(n)=>{const data=new Uint8Array(n);for(let i=0;i<n*8;i++)data[i>>>3]|=(pixels[position(i,pixels.length)]&1)<<(7-i%8);return data;};
  const head=read(16), view=new DataView(head.buffer);
  if(!MAGIC.every((b,i)=>head[i]===b)) return fail();
  const length=view.getUint32(4);
  if(!length || length>MAX_BYTES || (length+16)*8>pixels.length/4*3) return fail();
  const all=read(length+16), bytes=new Uint8Array(length), rng=random(view.getUint32(8)^0x4d6f6f6e);
  for(let i=0;i<length;i++)bytes[i]=all[16+i]^Math.floor(rng()*256);
  if(crc32(bytes)!==view.getUint32(12)) return fail();
  try{return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}catch{return fail();}
}
