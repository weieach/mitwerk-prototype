import { FullscreenIcon, MessageSquare, PhosphorIcon, FileText, Image, LayoutGrid, X } from '../../components/PhosphorIcon';
import type { Asset } from './model';
export type WorkspacePane = 'chat' | 'version' | `asset:${string}`;
const Circuitry = ({size}:{size:number}) => <PhosphorIcon name="circuitry" size={size}/>;
const assetIcons={document:FileText,image:Image,prototype:LayoutGrid};
export function WorkspaceTabs({ selected, fullscreen, onSelect, onToggle, assets=[], onClose }: {
 selected: WorkspacePane; fullscreen:boolean; onSelect:(pane:WorkspacePane)=>void; onToggle:()=>void;
 assets?:Asset[]; onClose:(id:string)=>void;
}) {
 const tabs=[{id:'chat' as WorkspacePane,label:'Chat',Icon:MessageSquare,assetId:''},
  {id:'version' as WorkspacePane,label:'Version control',Icon:Circuitry,assetId:''},
  ...assets.map(asset=>({id:`asset:${asset.id}` as WorkspacePane,label:asset.title,Icon:assetIcons[asset.kind],assetId:asset.id}))];
 return <div className="workspace-tabs-row">
  <div role="tablist" aria-label="Conversation views" className="workspace-tabs">
   {tabs.map(({id,label,Icon,assetId},index)=><div key={id} className="workspace-tab" data-selected={selected===id}>
    <button type="button" role="tab" id={`workspace-tab-${id}`} aria-selected={selected===id} aria-controls={`workspace-pane-${id}`} tabIndex={selected===id?0:-1} title={label}
     onClick={()=>onSelect(id)} onKeyDown={event=>{
      if(event.key==='Delete'&&assetId){event.preventDefault();onClose(assetId);return;}
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault(); const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length;
      onSelect(tabs[next].id); document.getElementById(`workspace-tab-${tabs[next].id}`)?.focus();
     }}><Icon size={15}/><span>{label}</span></button>
    {selected===id&&<button type="button" className="mw-icon workspace-fullscreen" aria-label={fullscreen?'Exit fullscreen':'Go to fullscreen'} title={fullscreen?'Exit fullscreen · Show chat and version control':'Go to fullscreen · Expand selected tab'} onClick={onToggle}>
   <FullscreenIcon expanded={fullscreen} size={16}/>
  </button>}
    {assetId&&<button className="workspace-tab-close" type="button" aria-label={`Close ${label}`} title={`Close ${label}`} onClick={()=>onClose(assetId)}><X size={13}/></button>}
   </div>)}
  </div>

 </div>;
}
