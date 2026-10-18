import assert from 'node:assert/strict';
import test from 'node:test';
import { makeInvitationBody, stepInvitation, invitationPhysics } from '../src/features/workbench/invitation-physics.ts';

for (const width of [180, 330, 750]) test(`invitation bodies land and settle inside a ${width}px card`, () => {
  const bodies=[makeInvitationBody(46,46,width*.72,-46,-55,3.5),makeInvitationBody(76,28,width*.36,-78.4,42,-1.5)];
  for(let i=0;i<invitationPhysics.duration/invitationPhysics.step;i++)stepInvitation(i*invitationPhysics.step<invitationPhysics.arrowDelay?[bodies[1]]:bodies,width,90);
  for(const b of bodies){
    assert.ok([b.x,b.y,b.angle,b.vx,b.vy,b.spin].every(Number.isFinite));
    const points=b.hull.map(p=>({x:b.x+p.x*Math.cos(b.angle)-p.y*Math.sin(b.angle),y:b.y+p.x*Math.sin(b.angle)+p.y*Math.cos(b.angle)}));
    assert.ok(Math.min(...points.map(p=>p.x))>=-.1);
    assert.ok(Math.max(...points.map(p=>p.x))<=width+.1);
    assert.ok(Math.max(...points.map(p=>p.y))<=90.1);
    assert.ok(Math.max(...points.map(p=>p.y))>=89, 'rests on the floor');
    assert.ok(Math.hypot(b.vx,b.vy)<3, 'linear velocity settled');
    assert.ok(Math.abs(b.spin)<.1, 'angular velocity settled');
  }
});
test('colliding bodies exchange momentum',()=>{
  const a=makeInvitationBody(46,46,100,50,100,0),b=makeInvitationBody(76,28,145,50,-100,0);
  stepInvitation([a,b],330,500);
  assert.ok(a.vx<100);assert.ok(b.vx>-100);
  assert.ok(b.x-a.x>45, 'overlap resolved');
});

test('paired landing keeps circle left of a tilted pill with close spacing at any card width', async()=>{
  const {invitationRestPose,guideInvitation}=await import('../src/features/workbench/invitation-physics.ts');
  for(const width of [180,330,750]){
    const bodies=[makeInvitationBody(73,73,width*.5,-73,30,3.5),makeInvitationBody(73,32,width*.8,-32,-18,-1.5)];
    const targets=invitationRestPose(width,90,bodies[0],bodies[1]);
    bodies.forEach((b,i)=>b.x=targets[i].x+(i===0?-12:8));
    for(let i=0;i<720;i++){
      const t=i*invitationPhysics.step;
      if(t>1.3)guideInvitation(bodies,targets,Math.min(1,(t-1.3)/.8));
      stepInvitation(t<invitationPhysics.arrowDelay?[bodies[1]]:bodies,width,90);
    }
    bodies.forEach((b,i)=>assert.ok(Math.hypot(b.x-targets[i].x,b.y-targets[i].y)<.5));
    assert.ok(Math.abs(bodies[1].angle-targets[1].angle)<.01);
    assert.ok(bodies[0].x<bodies[1].x);
    const pill=bodies[1],circle=bodies[0],half=(pill.width-pill.height)/2;
    const cap={x:pill.x-half*Math.cos(pill.angle),y:pill.y-half*Math.sin(pill.angle)};
    const gap=Math.hypot(cap.x-circle.x,cap.y-circle.y)-(circle.height+pill.height)/2;
    assert.ok(gap>1.5&&gap<2.5);
  }
});

test('pill reaches the floor tilted beside the edge instead of landing flat then sliding', async()=>{
  const {invitationRestPose,guideInvitation,guidePillDescent}=await import('../src/features/workbench/invitation-physics.ts');
  for(const width of [180,330,750]){
    const bodies=[makeInvitationBody(73,73,0,-73,30,3.5),makeInvitationBody(73,32,0,-32,0,0)];
    const targets=invitationRestPose(width,90,bodies[0],bodies[1]);
    bodies.forEach((b,i)=>b.x=targets[i].x+(i===0?-12:0));bodies[1].angle=targets[1].angle;
    let contacts=0;
    for(let i=0;i<720;i++){
      const t=i*invitationPhysics.step,landing=Math.max(0,Math.min(1,(t-1.3)/.8));
      guidePillDescent(bodies[1],targets[1],1-landing);
      if(landing>0)guideInvitation(bodies,targets,landing);
      stepInvitation(t<invitationPhysics.arrowDelay?[bodies[1]]:bodies,width,90);
      const p=bodies[1],floor=p.y+p.height/2+(p.width-p.height)/2*Math.abs(Math.sin(p.angle));
      if(floor>89){contacts++;assert.ok(p.angle<-.2,'floor contact stays tilted');assert.ok(Math.abs(p.x-targets[1].x)<5,'lands next to wall');}
    }
    assert.ok(contacts>0);
  }
});

test('responsive releases are covered by the preview and settle in the paired pose', async()=>{
  const {invitationReleasePose,invitationRestPose,guideInvitation,guidePillDescent}=await import('../src/features/workbench/invitation-physics.ts');
  for(const [width,height,coverWidth,coverHeight] of [[270,268,270,112],[350,236,350,146],[710,88,211,88]]){
    const bodies=[makeInvitationBody(73,73,0,0,0,3.5),makeInvitationBody(73,32,0,0,0,0)];
    const targets=invitationRestPose(width,height,bodies[0],bodies[1]);
    const cover={x:0,y:0,width:coverWidth,height:coverHeight};
    bodies.forEach((body,i)=>{
      Object.assign(body,invitationReleasePose(cover,body,targets[i]));
      body.vx=(targets[i].x-body.x)/.45;
      for(const p of body.hull){
        const x=body.x+p.x*Math.cos(body.angle)-p.y*Math.sin(body.angle);
        const y=body.y+p.x*Math.sin(body.angle)+p.y*Math.cos(body.angle);
        assert.ok(x>=0&&x<=coverWidth&&y>=0&&y<=coverHeight,'entire shape starts under image');
      }
    });
    for(let i=0;i<720;i++){
      const t=i*invitationPhysics.step,landing=Math.max(0,Math.min(1,(t-1.3)/.8));
      guidePillDescent(bodies[1],targets[1],1-landing);
      if(landing>0)guideInvitation(bodies,targets,landing);
      stepInvitation(t<invitationPhysics.arrowDelay?[bodies[1]]:bodies,width,height);
    }
    bodies.forEach((b,i)=>assert.ok(Math.hypot(b.x-targets[i].x,b.y-targets[i].y)<.5,'settles into paired pose'));
  }
});
