import { useEffect, useRef } from 'react';
import { observeTheme } from '../../shared/theme';

/** Seconds-to-phase speed of the drifting color masses; lower is calmer. */
const drift = 0.22;
const maxPixelRatio = 1.5;

const vertex = `attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

// Three large, soft color masses whose centers wander on slow, out-of-phase orbits. Each pixel takes a Gaussian-weighted
// average of the three colors, so they melt into one another instead of forming edges; a low-frequency warp keeps the drift organic.
const fragment = `precision mediump float;
uniform vec2 res; uniform float t; uniform vec3 c0; uniform vec3 c1; uniform vec3 c2;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float mass(vec2 p, vec2 c, float r) { vec2 d = p - c; return exp(-dot(d, d) / (r * r)); }
void main() {
  float aspect = res.x / res.y;
  vec2 p = vec2(gl_FragCoord.x / res.y, gl_FragCoord.y / res.y);
  p += 0.22 * vec2(sin(p.y * 1.7 + t * 0.9), cos(p.x * 0.6 - t * 0.7));
  float r = 0.55 + 0.18 * aspect;
  vec2 a = vec2(aspect * (0.5 + 0.42 * sin(t * 0.61)), 0.5 + 0.55 * cos(t * 0.47));
  vec2 b = vec2(aspect * (0.5 + 0.44 * sin(t * 0.43 + 2.1)), 0.5 + 0.6 * cos(t * 0.37 + 1.3));
  vec2 c = vec2(aspect * (0.5 + 0.40 * sin(t * 0.53 + 4.2)), 0.5 + 0.5 * cos(t * 0.59 + 3.7));
  float wa = mass(p, a, r), wb = mass(p, b, r * 1.1), wc = mass(p, c, r * 0.95);
  vec3 col = (c0 * (wa + 0.08) + c1 * (wb + 0.08) + c2 * (wc + 0.08)) / (wa + wb + wc + 0.24);
  col += (hash(gl_FragCoord.xy + t) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}`;

/** Parses a hex token (#rgb or #rrggbb) into 0–1 channels; other formats fall back to the computed color. */
function rgb(value: string) {
  const hex = value.replace('#', '');
  if (/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(hex)) {
    const full = hex.length === 3 ? [...hex].map(c => c + c).join('') : hex;
    return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16) / 255);
  }
  const probe = document.createElement('span');
  probe.style.color = value;
  document.body.appendChild(probe);
  const match = getComputedStyle(probe).color.match(/[\d.]+/g) ?? ['0', '0', '0'];
  probe.remove();
  return match.slice(0, 3).map(channel => Number(channel) / 255);
}

/** Living color field behind the milestone invitation. Colors come from `--milestone-invite-a/b/c`; it pauses off screen and holds one frame with reduced motion. */
export function MilestoneInviteField() {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current!;
    const gl = element.getContext('webgl', { antialias: false, premultipliedAlpha: false });
    if (!gl) return;
    const compile = (type: number, source: string) => { const shader = gl.createShader(type)!; gl.shaderSource(shader, source); gl.compileShader(shader); return shader; };
    const program = gl.createProgram()!;
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertex));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragment));
    gl.linkProgram(program);
    gl.useProgram(program);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniform = (name: string) => gl.getUniformLocation(program, name);
    // Colors follow the theme: re-read the tokens whenever light or dark mode changes.
    const applyColors = () => {
      const style = getComputedStyle(element);
      (['c0', 'c1', 'c2'] as const).forEach((name, index) => gl.uniform3fv(uniform(name), rgb(style.getPropertyValue(`--milestone-invite-${'abc'[index]}`).trim())));
    };
    applyColors();

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const start = performance.now() - Math.random() * 30000;
    let frame = 0, visible = true;
    const draw = (now: number) => {
      gl.uniform1f(uniform('t'), ((now - start) / 1000) * drift);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const resize = () => {
      const ratio = Math.min(devicePixelRatio, maxPixelRatio);
      element.width = Math.max(1, Math.round(element.clientWidth * ratio));
      element.height = Math.max(1, Math.round(element.clientHeight * ratio));
      gl.viewport(0, 0, element.width, element.height);
      gl.uniform2f(uniform('res'), element.width, element.height);
      draw(performance.now());
    };
    const loop = (now: number) => { draw(now); frame = requestAnimationFrame(loop); };
    const run = () => { cancelAnimationFrame(frame); if (!reduced && visible && !document.hidden) frame = requestAnimationFrame(loop); };
    const stopTheme = observeTheme(() => { applyColors(); draw(performance.now()); });
    const sizer = new ResizeObserver(resize);
    sizer.observe(element);
    const watcher = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; run(); });
    watcher.observe(element);
    document.addEventListener('visibilitychange', run);
    resize(); run();
    return () => { cancelAnimationFrame(frame); stopTheme(); sizer.disconnect(); watcher.disconnect(); document.removeEventListener('visibilitychange', run); };
  }, []);
  return <canvas ref={canvas} className="milestone-invite-field" aria-hidden="true"/>;
}
