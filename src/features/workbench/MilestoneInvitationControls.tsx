import { useLayoutEffect, useRef } from 'react';
import { ArrowUpRight } from '../../components/PhosphorIcon';
import { invitationPhysics, makeInvitationBody, stepInvitation, invitationRestPose, guideInvitation, guidePillDescent, invitationReleasePose } from './invitation-physics';

export function MilestoneInvitationControls({onOpen,onDismiss,leaving=false}:{onOpen:()=>void;onDismiss:()=>void;leaving?:boolean}) {
  const host=useRef<HTMLDivElement>(null), arrow=useRef<HTMLButtonElement>(null),pill=useRef<HTMLButtonElement>(null);
  useLayoutEffect(()=>{
    const area=host.current!,elements=[arrow.current!,pill.current!],reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0;
    const start=()=>{
      cancelAnimationFrame(frame);area.dataset.settled='false';
      const icon=elements[0].firstElementChild as HTMLElement|null; if(icon) icon.style.transform='';
      const width=area.clientWidth,height=area.clientHeight;
      const bounds=area.getBoundingClientRect(),preview=area.closest('.message-version-card')!.querySelector('.message-version-preview')!.getBoundingClientRect();
      const cover={x:preview.left-bounds.left,y:preview.top-bounds.top,width:preview.width,height:preview.height};
      const bodies=elements.map((element,i)=>makeInvitationBody(element.offsetWidth,element.offsetHeight,i===0?width-element.offsetWidth/2-4:width*.32,-element.offsetHeight,i===0?-25:24,i===0?3.5:-1.5));
      const targets=invitationRestPose(width,height,bodies[0],bodies[1]);
      area.parentElement!.style.setProperty('--milestone-controls-width',`${width-targets[0].x+bodies[0].width/2}px`);
      bodies.forEach((body,i)=>{
        Object.assign(body,invitationReleasePose(cover,body,targets[i]));
        body.vx=(targets[i].x-body.x)/.45;
      });
      bodies[1].spin=0;
      const draw=()=>{bodies.forEach((b,i)=>{elements[i].style.transform=`translate(${b.x-b.width/2}px,${b.y-b.height/2}px) rotate(${b.angle}rad)`;if(i===0&&icon)icon.style.transform=`rotate(${-b.angle}rad)`;});area.dataset.positioned='true';};
      const settle=()=>{area.dataset.settled='true';};
      if(reduced.matches){bodies.forEach((b,i)=>Object.assign(b,targets[i]));draw();settle();return;}
      let last=0,elapsed=0,accumulator=0,simulationTime=0;
      const tick=(now:number)=>{
        const dt=last?Math.min((now-last)/1000,1/30):0;last=now;elapsed+=dt;accumulator+=dt;
        while(accumulator>=invitationPhysics.step){const landing=Math.max(0,Math.min(1,(simulationTime-1.3)/.8));guidePillDescent(bodies[1],targets[1],1-landing);if(landing>0)guideInvitation(bodies,targets,landing);stepInvitation(simulationTime<invitationPhysics.arrowDelay?[bodies[1]]:bodies,width,height);simulationTime+=invitationPhysics.step;accumulator-=invitationPhysics.step;}
        draw();
        if(elapsed<invitationPhysics.duration)frame=requestAnimationFrame(tick);else settle();
      };
      draw();frame=requestAnimationFrame(tick);
    };
    const observer=new ResizeObserver(start);observer.observe(area);elements.forEach(element=>observer.observe(element));reduced.addEventListener('change',start);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();reduced.removeEventListener('change',start);};
  },[]);
  return <div ref={host} className={`milestone-falling-controls${leaving ? ' is-leaving' : ''}`} inert={leaving}>
    <button ref={arrow} type="button" className="milestone-open outline-orbit" aria-label="Mark a new milestone" onClick={onOpen}><ArrowUpRight size="var(--milestone-arrow-size)"/></button>
    <button ref={pill} type="button" className="milestone-not-yet outline-orbit" onClick={onDismiss}>Not yet</button>
  </div>;
}
