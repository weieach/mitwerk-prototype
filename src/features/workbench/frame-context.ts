export type FrameContext = { id:string; url:string; label:string; filename:string };
export const attachFrameEvent = 'mitwerk-attach-frame';
export function appendFrameContext(current:FrameContext[], frame:FrameContext):FrameContext[] {
 return current.some(item=>item.id===frame.id) ? current : [...current,frame];
}
