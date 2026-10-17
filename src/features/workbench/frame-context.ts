export type FrameContext = { id:string; url:string; label:string; filename:string };
export const attachFrameEvent = 'mitwerk-attach-frame';
export const frameDragType = 'application/x-mitwerk-frame';
export function appendFrameContext(current:FrameContext[], frame:FrameContext):FrameContext[] {
 return current.some(item=>item.id===frame.id) ? current : [...current,frame];
}
export function attachFrame(frame:FrameContext) {
 window.dispatchEvent(new CustomEvent(attachFrameEvent,{detail:frame}));
}
export function writeFrameDrag(data:DataTransfer, frame:FrameContext) {
 data.effectAllowed='copy';
 data.setData(frameDragType,JSON.stringify(frame));
 data.setData('text/uri-list',new URL(frame.url,window.location.href).href);
}
export function hasFrameDrag(data:DataTransfer|null) {
 return !!data && Array.from(data.types).includes(frameDragType);
}
export function readFrameDrag(data:DataTransfer):FrameContext|null {
 try {
  const frame=JSON.parse(data.getData(frameDragType)) as Partial<FrameContext>;
  return frame && typeof frame.id==='string' && typeof frame.url==='string' ? {id:frame.id,url:frame.url,label:String(frame.label??''),filename:String(frame.filename??'')} : null;
 } catch { return null; }
}
