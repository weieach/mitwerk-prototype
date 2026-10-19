import { easeInOutCubic, progress, type LogoGeometry, type Point, type Rect, type Viewport } from './landing-intro.ts';

export const LANDING_ORBIT = {
  count:20, size:.6, diameter:.86, speed:.035, pulse:.12,
  accelerateDuration:2.4, decelerateDuration:.65, cycleDuration:9,
  revealDuration:.65, growDuration:2.4, scaleDuration:2.8, initialScale:.01,
  rotationStep:-10 * Math.PI / 180, rotationSpeed:.42, rotationStagger:.18, rotationEase:.9,
  tilt:.28, ambient:.2, diffuse:.8, light:{x:.6, y:-.45, z:.66},
} as const;

// Integral of smoothstep gives continuous position and velocity at pulse boundaries.
const smoothstepIntegral = (u:number) => u ** 3 - .5 * u ** 4;
/** One shared angular clock: gradual acceleration, a short eased slowdown, then a slow coast. */
export function orbitAngle(time:number) {
  const t = LANDING_ORBIT;
  const elapsed = Math.max(0, time);
  const cycles = Math.floor(elapsed / t.cycleDuration);
  const within = elapsed % t.cycleDuration;
  const pulseArea = (t.accelerateDuration + t.decelerateDuration) / 2;
  let area:number;
  if (within < t.accelerateDuration) {
    area = t.accelerateDuration * smoothstepIntegral(within / t.accelerateDuration);
  } else if (within < t.accelerateDuration + t.decelerateDuration) {
    const u = (within - t.accelerateDuration) / t.decelerateDuration;
    area = t.accelerateDuration / 2 + t.decelerateDuration * (u - smoothstepIntegral(u));
  } else area = pulseArea;
  return t.speed * elapsed + t.pulse * (cycles * pulseArea + area);
}

/** Evenly stepped starting phases; clockwise travel never oscillates or reverses. */
export function orbitRotation(time:number, index:number) {
  const initial = index * LANDING_ORBIT.rotationStep;
  const elapsed = Math.max(0, time - index * LANDING_ORBIT.rotationStagger);
  const ease = LANDING_ORBIT.rotationEase;
  const travel = elapsed < ease ? ease * smoothstepIntegral(elapsed / ease) : elapsed - ease / 2;
  return initial + LANDING_ORBIT.rotationSpeed * travel;
}

export function orbitQuads(time:number, viewport:Viewport, target:Rect, geometry:LogoGeometry) {
  const t = LANDING_ORBIT;
  const finalScale = target.height / geometry.height * t.size;
  const sheetScale = t.initialScale + (1 - t.initialScale) * easeInOutCubic(progress(time, 0, t.scaleDuration));
  const scale = finalScale * sheetScale;
  const radius = Math.max(0, Math.min(viewport.height * t.diameter / 2, viewport.width * .46 - geometry.frame.width * finalScale));
  const grownRadius = radius * easeInOutCubic(progress(time, 0, t.growDuration));
  const angle = orbitAngle(time);
  const { frame } = geometry;
  const middleY = (frame.topLeft + frame.bottomRight) / 2;
  const corners = [[0, frame.topLeft], [frame.width, frame.topRight], [frame.width, frame.bottomRight], [0, frame.bottomLeft]];
  // Lift the SVG's projected edges into one fixed, orthogonal 3D plane.
  // Rotate about the short edge itself: its screen projection stays vertical.
  const ux = frame.width, uy = frame.topRight - frame.topLeft, uz = frame.width / Math.sqrt(3);
  const vy = frame.bottomLeft - frame.topLeft, vz = -uy * vy / uz;
  const baseNormal = { x:uy * vz - uz * vy, y:-ux * vz, z:ux * vy };
  const normalLength = Math.hypot(baseNormal.x, baseNormal.y, baseNormal.z);
  const axisLength = Math.hypot(vy, vz);
  const axis = { x:0, y:vy / axisLength, z:vz / axisLength };
  const rotate = (p:{x:number;y:number;z:number}, cos:number, sin:number) => {
    const dot = axis.y * p.y + axis.z * p.z;
    return {
      x:p.x * cos + (axis.y * p.z - axis.z * p.y) * sin,
      y:p.y * cos + axis.z * p.x * sin + axis.y * dot * (1 - cos),
      z:p.z * cos - axis.y * p.x * sin + axis.z * dot * (1 - cos),
    };
  };
  return Array.from({ length:t.count }, (_, index) => {
    const phase = index / t.count * Math.PI * 2;
    const position = phase + angle;
    const yaw = orbitRotation(time, index);
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const center = { x:Math.cos(position) * grownRadius, y:Math.sin(position) * grownRadius * Math.cos(t.tilt), z:Math.sin(position) * grownRadius * Math.sin(t.tilt) };
    const rotatedNormal = rotate(baseNormal, cos, sin);
    const normal = { x:rotatedNormal.x / normalLength, y:rotatedNormal.y / normalLength, z:rotatedNormal.z / normalLength };
    const lightLength = Math.hypot(t.light.x, t.light.y, t.light.z);
    const incidence = Math.abs(normal.x * t.light.x + normal.y * t.light.y + normal.z * t.light.z) / lightLength;
    const light = t.ambient + t.diffuse * incidence;
    const points:Point[] = corners.map(([x, y]) => {
      const localX = (x - frame.width / 2) * scale, localY = (y - middleY) * scale;
      const u = x / ux - .5;
      const v = (y - frame.topLeft - uy * x / ux) / vy - .5;
      const localZ = (u * uz + v * vz) * scale;
      const rotated = rotate({x:localX, y:localY, z:localZ}, cos, sin);
      // Orthographic projection: depth affects painter order, never apparent scale.
      return { x:viewport.width / 2 + rotated.x + center.x, y:viewport.height / 2 + rotated.y + center.y };
    });
    return { id:index, points, depth:center.z, light, scale:sheetScale, opacity:easeInOutCubic(progress(time, 0, t.revealDuration)) };
  }).sort((a, b) => a.depth - b.depth);
}
