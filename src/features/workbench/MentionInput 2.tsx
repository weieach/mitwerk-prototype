import { useState } from 'react';
import type { RefObject } from 'react';
import { Workflow } from 'lucide-react';
import type { Mit } from './model';

type Props={inputRef:RefObject<HTMLTextAreaElement|null>;value:string;onChange:(value:string)=>void;onSend:()=>void;mits:Mit[];projectMitIds:string[];hasProject:boolean;placeholder:string;enabled:boolean};
export function MentionInput({inputRef,value,onChange,onSend,mits,projectMitIds,hasProject,placeholder,enabled}:Props){
 const [mention,setMention]=useState<{start:number;end:number;query:string}|null>(null);
 const [index,setIndex]=useState(0);
 const matches=mention?mits.filter(m=>m.name.toLowerCase().includes(mention.query.toLowerCase())).sort((a,b)=>Number(projectMitIds.includes(b.id))-Number(projectMitIds.includes(a.id))):[];
 function detect(text:string,caret:number){const match=/(?:^|\s)@([^\s@]*)$/.exec(text.slice(0,caret));setMention(enabled&&match?{start:caret-match[1].length-1,end:caret,query:match[1]}:null);setIndex(0);}
 function choose(mit:Mit){if(!mention)return;const inserted=`@${mit.name} `;onChange(value.slice(0,mention.start)+inserted+value.slice(mention.end));const caret=mention.start+inserted.length;setMention(null);requestAnimationFrame(()=>{inputRef.current?.focus();inputRef.current?.setSelectionRange(caret,caret);});}
 return <div className="mention-input"><textarea ref={inputRef} aria-label="Message" aria-expanded={!!mention} aria-controls={mention?'mit-mention-options':undefined} aria-activedescendant={mention&&matches[index]?`mit-option-${matches[index].id}`:undefined} placeholder={placeholder} value={value} onChange={e=>{onChange(e.target.value);detect(e.target.value,e.target.selectionStart);}} onClick={e=>detect(e.currentTarget.value,e.currentTarget.selectionStart)} onBlur={()=>setMention(null)} onKeyDown={e=>{if(e.nativeEvent.isComposing)return;if(mention){if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();setIndex(i=>matches.length?(i+(e.key==='ArrowDown'?1:-1)+matches.length)%matches.length:0);return;}if(e.key==='Escape'){e.preventDefault();e.stopPropagation();setMention(null);return;}if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();if(matches[index])choose(matches[index]);return;}}if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();onSend();}}}/>
 {mention&&<div className="mit-mention-menu"><div className="mention-menu-heading">Mention a Mit <small>{hasProject?'Added to this project when you send':'Joins this conversation when you send'}</small></div><div role="listbox" id="mit-mention-options" aria-label="Mits to mention">{matches.map((mit,i)=><button key={mit.id} id={`mit-option-${mit.id}`} type="button" role="option" aria-selected={index===i} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(mit)}><span className="mw-avatar is-mit"><Workflow size={15}/></span><span><strong>{mit.name}</strong><small>{mit.role}</small></span><small>{projectMitIds.includes(mit.id)?'In project':hasProject?'Add to project':'Mit'}</small></button>)}{!matches.length&&<p>No Mits found. Try another name.</p>}</div><footer>↑ ↓ to select · Enter to mention · Esc to close</footer></div>}
 </div>;
}
