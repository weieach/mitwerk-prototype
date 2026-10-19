import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { logoGeometry } from '../src/features/workbench/landing-intro.ts';
import { orbitQuads, orbitAngle, orbitRotation, LANDING_ORBIT } from '../src/features/workbench/landing-orbit.ts';

const asset = (name:string) => readFileSync(new URL(`../src/assets/${name}`, import.meta.url), 'utf8');
const geometry = logoGeometry(asset('logo-shape-part.svg'), asset('logo-shape.svg'));
const target = { x:600, y:430, width:40, height:50 };

test('orbit keeps twenty finite, depth-ordered quads within desktop and narrow viewports', () => {
  for (const viewport of [{width:1440, height:900}, {width:375, height:667}]) {
    for (const time of [0, 1, 8, 30, 120]) {
      const quads = orbitQuads(time, viewport, target, geometry);
      assert.equal(quads.length, LANDING_ORBIT.count);
      assert.ok(quads.every((q, i) => !i || q.depth >= quads[i - 1].depth));
      for (const { points } of quads) for (const p of points) {
        assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y));
        assert.ok(p.x >= 0 && p.x <= viewport.width && p.y >= 0 && p.y <= viewport.height);
      }
    }
  }
});

test('orbit eases in and accelerates periodically without reversing', () => {
  assert.equal(orbitQuads(0, {width:1440,height:900}, target, geometry)[0].opacity, 0);
  assert.equal(orbitQuads(2, {width:1440,height:900}, target, geometry)[0].opacity, 1);
  const velocities = Array.from({length:1000}, (_, i) => (orbitAngle(i * .1 + .01) - orbitAngle(i * .1)) / .01);
  assert.ok(Math.min(...velocities) > 0);
  assert.ok(Math.max(...velocities) > Math.min(...velocities) * 3);
});

test('ring grows from screen center and orthographic edges remain parallel at any depth', () => {
  const viewport = {width:1440, height:900};
  const center = (points:{x:number;y:number}[]) => ({x:points.reduce((sum,p)=>sum+p.x,0)/4,y:points.reduce((sum,p)=>sum+p.y,0)/4});
  for (const q of orbitQuads(0, viewport, target, geometry)) {
    const c = center(q.points);
    assert.ok(Math.abs(c.x - viewport.width / 2) < 1e-6);
    assert.ok(Math.abs(c.y - viewport.height / 2) < 1e-6);
  }
  for (const q of orbitQuads(5, viewport, target, geometry)) {
    const c = center(q.points);
    assert.ok(Math.hypot(c.x - viewport.width / 2,c.y - viewport.height / 2) > 350);
    const [a,b,c1,d] = q.points;
    assert.ok(Math.abs((b.x-a.x)-(c1.x-d.x)) < 1e-6);
    assert.ok(Math.abs((b.y-a.y)-(c1.y-d.y)) < 1e-6);
  }
  // Changing orbit depth/radius doesn't change any quad's edge lengths.
  const wide = orbitQuads(5, viewport, target, geometry);
  const tall = orbitQuads(5, {...viewport,height:1000}, target, geometry);
  for (const a of wide) {
    const b = tall.find(q=>q.id===a.id)!;
    assert.ok(Math.abs(Math.hypot(a.points[1].x-a.points[0].x,a.points[1].y-a.points[0].y)-Math.hypot(b.points[1].x-b.points[0].x,b.points[1].y-b.points[0].y))<1e-6);
  }
});

test('directional lighting varies with staggered short-edge rotation', () => {
  const quads = orbitQuads(8, {width:1440,height:900}, target, geometry);
  assert.ok(Math.max(...quads.map(q=>q.light))-Math.min(...quads.map(q=>q.light)) > .5);
  assert.ok(quads.every(q=>q.light >= LANDING_ORBIT.ambient && q.light <= 1));

});


test('sheets grow from 1% and ring spacing stays fixed while short edges stay vertical', () => {
  const viewport = {width:1440,height:900};
  const initial = orbitQuads(0, viewport, target, geometry);
  const final = orbitQuads(4, viewport, target, geometry);
  for (const q of initial) {
    const full = final.find(f=>f.id===q.id)!;
    assert.equal(q.scale, .01);
    assert.equal(full.scale, 1);
    assert.ok(Math.abs((q.points[3].y-q.points[0].y)/(full.points[3].y-full.points[0].y)-.01)<1e-6);
  }
  for (const time of [.5, 2, 5, 12, 40]) {
    const quads = orbitQuads(time, viewport, target, geometry).sort((a,b)=>a.id-b.id);
    const angles = quads.map(q=>{
      const factor = target.height / geometry.height * LANDING_ORBIT.size * q.scale;
      // Both short edges stay exactly perpendicular to the screen bottom.
      assert.ok(Math.abs(q.points[3].x-q.points[0].x)<1e-6);
      assert.ok(Math.abs(q.points[2].x-q.points[1].x)<1e-6);
      assert.ok(Math.abs((q.points[3].y-q.points[0].y)-(geometry.frame.bottomLeft-geometry.frame.topLeft)*factor)<1e-6);
      const x=q.points.reduce((sum,p)=>sum+p.x,0)/4-viewport.width/2;
      const y=(q.points.reduce((sum,p)=>sum+p.y,0)/4-viewport.height/2)/Math.cos(LANDING_ORBIT.tilt);
      return Math.atan2(y,x);
    });
    for (let i=1;i<angles.length;i++) {
      const difference=(angles[i]-angles[i-1]+Math.PI*2)%(Math.PI*2);
      assert.ok(Math.abs(difference-Math.PI*2/LANDING_ORBIT.count)<1e-6);
    }
  }
});

test('shared orbit slows to its coasting speed in the shorter deceleration interval', () => {
  const speed=(time:number)=>(orbitAngle(time+.0001)-orbitAngle(time))/.0001;
  const t=LANDING_ORBIT;
  assert.ok(t.decelerateDuration<t.accelerateDuration/3);
  assert.ok(Math.abs(speed(t.accelerateDuration)-(t.speed+t.pulse))<1e-5);
  assert.ok(Math.abs(speed(t.accelerateDuration+t.decelerateDuration)-t.speed)<1e-5);
  assert.ok(Math.abs(speed(t.cycleDuration-.001)-speed(t.cycleDuration+.001))<1e-5);
});


test('initial angles decrease by 45 degrees per sheet while motion stays clockwise', () => {
  const starts = Array.from({length:LANDING_ORBIT.count}, (_,index)=>orbitRotation(0,index));
  const step = -45 * Math.PI / 180;
  assert.equal(starts[0],0);
  for(let index=0;index<LANDING_ORBIT.count;index++) {
    if (index > 0) assert.ok(Math.abs(starts[index]-starts[index-1]-step)<1e-9);
    assert.equal(orbitRotation(index*LANDING_ORBIT.rotationStagger,index),starts[index]);
    for(let time=0;time<90;time+=.05) assert.ok(orbitRotation(time+.05,index)>=orbitRotation(time,index));
    assert.ok(orbitRotation(90,index)-starts[index]>Math.PI*4);
  }
});
