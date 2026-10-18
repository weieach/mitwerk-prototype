/** Small fixed-step rigid-body scene for the invitation's circle and capsule. Units are CSS pixels. */
export type Point = { x: number; y: number };
export type InvitationBody = { x:number; y:number; vx:number; vy:number; angle:number; spin:number; mass:number; inertia:number; hull:Point[]; width:number; height:number };
const dot = (a:Point,b:Point) => a.x*b.x+a.y*b.y;
const cross = (a:Point,b:Point) => a.x*b.y-a.y*b.x;
export const invitationPhysics = { gravity:850, bounce:.38, friction:.55, step:1/120, duration:6, arrowDelay:.45 } as const;
export function makeInvitationBody(width:number,height:number,x:number,y:number,vx:number,spin:number):InvitationBody {
  const radius=height/2, half=(width-height)/2;
  const hull=Array.from({length:24},(_,i)=>{const a=i*Math.PI/12;return {x:Math.cos(a)*radius+(Math.cos(a)>=0?half:-half),y:Math.sin(a)*radius};});
  const mass=width*height/1000;
  return {width,height,x,y,vx,vy:0,angle:0,spin,mass,inertia:mass*(width*width+height*height)/12,hull};
}
function vertices(b:InvitationBody):Point[] {const c=Math.cos(b.angle),s=Math.sin(b.angle);return b.hull.map(p=>({x:b.x+p.x*c-p.y*s,y:b.y+p.x*s+p.y*c}));}
function velocity(b:InvitationBody,r:Point):Point {return {x:b.vx-b.spin*r.y,y:b.vy+b.spin*r.x};}
function impulse(b:InvitationBody,p:Point,r:Point) {b.vx+=p.x/b.mass;b.vy+=p.y/b.mass;b.spin+=cross(r,p)/b.inertia;}
function contact(a:InvitationBody,b:InvitationBody|null,p:Point,n:Point) {
  const ra={x:p.x-a.x,y:p.y-a.y}, rb=b?{x:p.x-b.x,y:p.y-b.y}:{x:0,y:0};
  const va=velocity(a,ra),vb=b?velocity(b,rb):{x:0,y:0},relative={x:va.x-vb.x,y:va.y-vb.y};
  const speed=dot(relative,n);if(speed>=0)return;
  const inv=1/a.mass+(b?1/b.mass:0),denom=inv+cross(ra,n)**2/a.inertia+(b?cross(rb,n)**2/b.inertia:0);
  const j=-(1+(speed < -35 ? invitationPhysics.bounce : 0))*speed/denom;
  const tangent={x:-n.y,y:n.x},td=inv+cross(ra,tangent)**2/a.inertia+(b?cross(rb,tangent)**2/b.inertia:0);
  const f=Math.max(-j*invitationPhysics.friction,Math.min(j*invitationPhysics.friction,-dot(relative,tangent)/td));
  const force={x:n.x*j+tangent.x*f,y:n.y*j+tangent.y*f};impulse(a,force,ra);if(b)impulse(b,{x:-force.x,y:-force.y},rb);
}
function wall(b:InvitationBody,n:Point,offset:number) {
  const points=vertices(b),minimum=Math.min(...points.map(p=>dot(p,n)));
  if(minimum>=offset)return;
  const touching=points.filter(p=>dot(p,n)<minimum+1);
  const p=touching.reduce((s,v)=>({x:s.x+v.x/touching.length,y:s.y+v.y/touching.length}),{x:0,y:0});
  contact(b,null,p,n);b.x+=n.x*(offset-minimum);b.y+=n.y*(offset-minimum);
}
function collide(a:InvitationBody,b:InvitationBody) {
  const av=vertices(a),bv=vertices(b);let depth=Infinity,normal={x:0,y:0};
  for(const shape of [av,bv])for(let i=0;i<shape.length;i++){
    const p=shape[i],q=shape[(i+1)%shape.length],length=Math.hypot(q.x-p.x,q.y-p.y),axis={x:-(q.y-p.y)/length,y:(q.x-p.x)/length};
    const ap=av.map(v=>dot(v,axis)),bp=bv.map(v=>dot(v,axis));
    const overlap=Math.min(Math.max(...ap),Math.max(...bp))-Math.max(Math.min(...ap),Math.min(...bp));
    if(overlap<=0)return;if(overlap<depth){depth=overlap;normal=axis;}
  }
  if(dot({x:a.x-b.x,y:a.y-b.y},normal)<0)normal={x:-normal.x,y:-normal.y};
  const nearest=(vs:Point[],n:Point)=>{const best=Math.min(...vs.map(v=>dot(v,n)));const ps=vs.filter(v=>dot(v,n)<best+1);return ps.reduce((s,p)=>({x:s.x+p.x/ps.length,y:s.y+p.y/ps.length}),{x:0,y:0});};
  const pa=nearest(av,normal),pb=nearest(bv,{x:-normal.x,y:-normal.y});
  contact(a,b,{x:(pa.x+pb.x)/2,y:(pa.y+pb.y)/2},normal);
  const total=a.mass+b.mass;a.x+=normal.x*depth*b.mass/total;a.y+=normal.y*depth*b.mass/total;b.x-=normal.x*depth*a.mass/total;b.y-=normal.y*depth*a.mass/total;
}
export function stepInvitation(bodies:InvitationBody[],width:number,height:number,dt=invitationPhysics.step) {
  for(const b of bodies){b.vy+=invitationPhysics.gravity*dt;b.vx*=Math.exp(-.6*dt);b.spin*=Math.exp(-.9*dt);b.x+=b.vx*dt;b.y+=b.vy*dt;b.angle+=b.spin*dt;}
  for(let pass=0;pass<4;pass++){
    for(let i=0;i<bodies.length;i++)for(let j=i+1;j<bodies.length;j++)collide(bodies[i],bodies[j]);
    for(const b of bodies){wall(b,{x:1,y:0},0);wall(b,{x:-1,y:0},-width);wall(b,{x:0,y:-1},-height);}
  }
}

/** Bottom-right landing anchors: circle beside the capsule's lower rounded end. */
export function invitationRestPose(width:number,height:number,circle:InvitationBody,pill:InvitationBody) {
  const angle=-Math.PI/7, inset=2, gap=2, r=pill.height/2, half=(pill.width-pill.height)/2,R=circle.height/2;
  const x=width-inset-r-half*Math.cos(angle),y=height-inset-r-half*Math.abs(Math.sin(angle));
  const cap={x:x-half*Math.cos(angle),y:y-half*Math.sin(angle)};
  const circleY=height-inset-R;
  const circleX=cap.x-Math.sqrt((R+r+gap)**2-(cap.y-circleY)**2);
  return [{x:circleX,y:circleY,angle:0},{x,y,angle}];
}
/** Damped landing constraints retain collisions while guiding the two bodies into their resting arrangement. */
export function guidePillDescent(pill:InvitationBody,target:{x:number;angle:number},strength=1,dt=invitationPhysics.step) {
  // Hold the capsule beside the wall while gravity controls its fall, avoiding a flat floor landing followed by a sideways shove.
  pill.vx+=((target.x-pill.x)*220-pill.vx*28)*strength*dt;
  const error=Math.atan2(Math.sin(target.angle-pill.angle),Math.cos(target.angle-pill.angle));
  pill.spin+=(error*1000-pill.spin*65)*strength*dt;
}
export function guideInvitation(bodies:InvitationBody[],targets:{x:number;y:number;angle:number}[],strength:number,dt=invitationPhysics.step) {
  bodies.forEach((b,i)=>{
    const target=targets[i];
    b.vx+=((target.x-b.x)*220-b.vx*28)*strength*dt;
    b.vy+=((target.y-b.y)*220-b.vy*28-invitationPhysics.gravity)*strength*dt;
    if(i===1){const error=Math.atan2(Math.sin(target.angle-b.angle),Math.cos(target.angle-b.angle));b.spin+=(error*180-b.spin*25)*strength*dt;}
  });
}
