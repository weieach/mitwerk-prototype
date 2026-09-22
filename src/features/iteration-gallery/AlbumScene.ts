import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { GalleryVersion } from './model';
import { dateTicks, formatDate, formatTime } from './model';
import type { buildAlbum, FramePlane } from './geometry';
import { galleryTokens as t } from './tokens';

type Album = ReturnType<typeof buildAlbum>;
type FrameObject = { plane: FramePlane; group: THREE.Group; image: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; outline: THREE.LineBasicMaterial };
type Callbacks = { hover: (id: string | null) => void; open: (id: string) => void; zoom: (value: number) => void; error: (message: string) => void };

/** Owns GPU resources and controls; React owns the data, filters and theater selection. */
export class AlbumScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 100_000);
  private controls: OrbitControls;
  private content = new THREE.Group();
  private frames = new Map<string, FrameObject>();
  private pickTargets: THREE.Mesh[] = [];
  private labels: { element: HTMLSpanElement; position: THREE.Vector3 }[] = [];
  private textures = new Map<string, THREE.Texture>();
  private pending = new Set<string>();
  private fades = new Map<THREE.Material, { opacity: number; target: number }>();
  private observer: ResizeObserver;
  private raycaster = new THREE.Raycaster();
  private hovered: string | null = null;
  private endpoints = new Set<string>();
  private down: { x: number; y: number; pointer: number } | null = null;
  private dragged = false;
  private dead = false;
  private tick = 0;
  private lastTime = 0;
  private span = 1;
  private initialized = false;
  private inspectionLabel: HTMLSpanElement;
  private failedTextures = new Set<string>();
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private colors: { paper: string; ink: string; muted: string; line: string };

  constructor(private host: HTMLDivElement, private callbacks: Callbacks) {
    const css = getComputedStyle(host);
    this.colors = { paper: css.getPropertyValue('--paper').trim(), ink: css.getPropertyValue('--ink').trim(), muted: css.getPropertyValue('--muted').trim(), line: css.getPropertyValue('--line-strong').trim() };
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, t.webgl.pixelRatioMax));
    this.renderer.setClearColor(this.colors.paper);
    const canvas = this.renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', '3D iteration gallery. Drag to rotate. Scroll to zoom. Right drag to pan. Arrow keys rotate; Home resets the view.');
    host.append(canvas);
    this.inspectionLabel = document.createElement('span');
    this.inspectionLabel.className = 'album-3d-label album-3d-inspection';
    this.inspectionLabel.hidden = true;
    this.inspectionLabel.setAttribute('aria-hidden', 'true');
    host.append(this.inspectionLabel);
    this.scene.add(this.content);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = false;
    this.controls.minZoom = t.zoomMin;
    this.controls.maxZoom = t.zoomMax;
    this.controls.rotateSpeed = t.webgl.rotateSpeed;
    this.controls.addEventListener('change', this.controlChange);
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointermove', this.pointerMove);
    canvas.addEventListener('pointerup', this.pointerUp);
    canvas.addEventListener('click', this.click);
    canvas.addEventListener('pointercancel', this.pointerCancel);
    canvas.addEventListener('pointerleave', this.pointerLeave);
    canvas.addEventListener('keydown', this.keyDown);
    canvas.addEventListener('webglcontextlost', this.contextLost);
    this.observer = new ResizeObserver(this.resize);
    this.observer.observe(host);
  }

  private invalidate = () => { if (!this.dead && !this.tick) this.tick = requestAnimationFrame(this.render); };
  private render = (time: number) => {
    this.tick = 0;
    if (this.dead) return;
    const dt = Math.min(64, time - (this.lastTime || time));
    this.lastTime = time;
    const blend = this.reducedMotion ? 1 : 1 - Math.exp(-dt / (t.transitionMs / 3));
    let moving = false;
    for (const [material, fade] of this.fades) {
      fade.opacity += (fade.target - fade.opacity) * blend;
      if (Math.abs(fade.target - fade.opacity) < .002) fade.opacity = fade.target; else moving = true;
      material.opacity = fade.opacity;
    }
    for (const [id, frame] of this.frames) {
      const target = id === this.hovered ? t.hoverLift : 0;
      frame.group.position.y += (target - frame.group.position.y) * blend;
      if (Math.abs(target - frame.group.position.y) < .05) frame.group.position.y = target; else moving = true;
    }
    this.renderer.render(this.scene, this.camera);
    const { clientWidth: width, clientHeight: height } = this.host;
    for (const label of this.labels) {
      const p = label.position.clone().project(this.camera);
      label.element.hidden = Math.abs(p.x) > 1 || Math.abs(p.y) > 1 || p.z < -1 || p.z > 1;
      label.element.style.transform = `translate(${(p.x + 1) * width / 2}px, ${(1 - p.y) * height / 2}px) translate(-50%, -50%)`;
    }
    const hovered = this.hovered ? this.frames.get(this.hovered) : undefined;
    this.inspectionLabel.hidden = !hovered;
    if (hovered) {
      const { plane } = hovered;
      const p = new THREE.Vector3(plane.x + plane.width / 2, -plane.y + hovered.group.position.y, -plane.depth).project(this.camera);
      this.inspectionLabel.textContent = `V${plane.frame.version} · ${formatTime(plane.frame.timestamp)} — ${plane.frame.summary.slice(0, t.labelSummaryLength)}`;
      this.inspectionLabel.style.transform = `translate(${(p.x + 1) * width / 2}px, ${(1 - p.y) * height / 2}px) translate(-50%, -100%)`;
    }
    if (moving) this.invalidate();
  };
  private controlChange = () => { this.callbacks.zoom(this.camera.zoom); this.invalidate(); };
  private resize = () => {
    const width = this.host.clientWidth, height = this.host.clientHeight;
    if (!width || !height) return;
    const aspect = width / height;
    const vertical = this.span / Math.min(1, aspect);
    this.camera.left = -vertical * aspect / 2;
    this.camera.right = vertical * aspect / 2;
    this.camera.top = vertical / 2;
    this.camera.bottom = -vertical / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.invalidate();
  };
  private contextLost = (event: Event) => { event.preventDefault(); this.callbacks.error('The 3D view lost its graphics connection. Reload the page to restore it. You can still open frames below.'); };
  private keyDown = (event: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home'].includes(event.key)) return;
    event.preventDefault();
    if (event.key === 'Home') this.reset();
    else {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') this.controls.rotateLeft((event.key === 'ArrowLeft' ? 1 : -1) * t.webgl.keyRotateRadians);
      else this.controls.rotateUp((event.key === 'ArrowUp' ? 1 : -1) * t.webgl.keyRotateRadians);
      this.controls.update();
    }
  };
  private pointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    this.down = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
    this.dragged = false;
  };
  private pointerMove = (event: PointerEvent) => {
    if (this.down) {
      this.dragged ||= Math.hypot(event.clientX - this.down.x, event.clientY - this.down.y) > t.webgl.dragThreshold;
      if (this.dragged) this.inspect(null);
    } else if (event.buttons === 0) this.inspect(this.pick(event));
  };
  private pointerUp = (event: PointerEvent) => {
    const down = this.down;
    this.down = null;
    if (!down || event.pointerId !== down.pointer) return;
    this.dragged ||= Math.hypot(event.clientX - down.x, event.clientY - down.y) > t.webgl.dragThreshold;
  };
  private click = (event: MouseEvent) => {
    if (!this.dragged) {
      const id = this.pick(event);
      if (id) this.callbacks.open(id);
    }
  };
  private pointerCancel = () => { this.down = null; this.dragged = false; this.inspect(null); };
  private pointerLeave = () => { if (!this.down) this.inspect(null); };
  private pick(event: MouseEvent) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), this.camera);
    const hits = this.raycaster.intersectObjects(this.pickTargets, false);
    // Stable slice targets prevent a newly lifted image from stealing the next hover.
    // Outside the block, the exposed image remains directly clickable.
    const hit = hits.find(item => item.object.userData.version !== undefined) ?? hits[0];
    if (!hit) return null;
    const direct = hit.object.userData.frameId as string | undefined;
    if (direct) return this.frames.get(direct)?.plane.active ? direct : null;
    const version = hit.object.userData.version as number;
    const depth = THREE.MathUtils.clamp(-hit.point.z, hit.object.userData.start, hit.object.userData.end);
    const frame = [...this.frames.values()].filter(item => item.plane.frame.version === version)
      .find(item => depth >= item.plane.hitStart && depth <= item.plane.hitEnd);
    return frame?.plane.active ? frame.plane.frame.id : null;
  }

  inspect(id: string | null) {
    if (id && !this.frames.get(id)?.plane.active) id = null;
    if (id === this.hovered) return;
    this.hovered = id;
    this.callbacks.hover(id);
    this.updateImages();
    this.invalidate();
  }
  setZoom(zoom: number) {
    this.camera.zoom = THREE.MathUtils.clamp(zoom, t.zoomMin, t.zoomMax);
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }
  reset() { this.controls.reset(); this.invalidate(); }

  private fade(material: THREE.Material, opacity: number, old?: Map<string, number>, key = '') {
    material.transparent = true;
    material.depthWrite = false;
    const start = old?.get(key) ?? opacity;
    material.opacity = start;
    this.fades.set(material, { opacity: start, target: opacity });
    material.userData.fadeKey = key;
  }
  private label(text: string, x: number, y: number, z: number) {
    const element = document.createElement('span');
    element.className = 'album-3d-label';
    element.textContent = text;
    element.setAttribute('aria-hidden', 'true');
    this.host.append(element);
    this.labels.push({ element, position: new THREE.Vector3(x, y, z) });
  }
  private line(points: THREE.Vector3[]) {
    const material = new THREE.LineBasicMaterial({ color: this.colors.line });
    this.content.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }

  update(album: Album, versions: GalleryVersion[]) {
    const previous = new Map([...this.fades].map(([material, fade]) => [material.userData.fadeKey as string, fade.opacity]));
    this.clearContent();
    this.hovered = null;
    this.callbacks.hover(null);
    const active = album.planes.filter(plane => plane.active);
    this.endpoints = new Set([active[0]?.frame.id, active.at(-1)?.frame.id].filter((id): id is string => Boolean(id)));
    for (const block of album.blocks) {
      const geometry = new THREE.BoxGeometry(block.width, block.height, block.end - block.start);
      const material = new THREE.MeshBasicMaterial({ color: this.colors.line, side: THREE.DoubleSide });
      this.fade(material, t.webgl.blockOpacity * (block.active ? 1 : t.disabledOpacity), previous, `box:${block.key}`);
      const box = new THREE.Mesh(geometry, material);
      box.position.set(block.width / 2, -block.height / 2, -(block.start + block.end) / 2);
      box.userData.version = block.version;
      box.userData.start = block.start;
      box.userData.end = block.end;
      this.content.add(box);
      this.pickTargets.push(box);
      const edgeMaterial = new THREE.LineBasicMaterial({ color: this.colors.muted });
      this.fade(edgeMaterial, block.active ? t.webgl.edgeOpacity : t.disabledOpacity, previous, `edge:${block.key}`);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMaterial);
      edges.position.copy(box.position);
      this.content.add(edges);
    }
    for (const plane of album.planes) {
      const group = new THREE.Group();
      const geometry = new THREE.PlaneGeometry(plane.width, plane.height);
      const material = new THREE.MeshBasicMaterial({ color: this.colors.paper, side: THREE.DoubleSide, transparent: true, depthWrite: false });
      const image = new THREE.Mesh(geometry, material);
      image.position.set(plane.x + plane.width / 2, -plane.y - plane.height / 2, -plane.depth);
      image.userData.frameId = plane.frame.id;
      image.visible = false;
      const outline = new THREE.LineBasicMaterial({ color: this.colors.line });
      this.fade(outline, plane.active ? t.webgl.frameOutlineOpacity : t.disabledOpacity, previous, `frame:${plane.frame.id}`);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), outline);
      edges.position.copy(image.position);
      group.add(image, edges);
      this.content.add(group);
      this.frames.set(plane.frame.id, { plane, group, image, outline });
    }
    const rulerY = -t.maxImageHeight - t.padding * 2 - t.rulerGap;
    this.line([new THREE.Vector3(-t.rulerGap, 0, 0), new THREE.Vector3(-t.rulerGap, 0, -album.depth)]);
    this.line([new THREE.Vector3(album.width + t.rulerGap, rulerY, 0), new THREE.Vector3(album.width + t.rulerGap, rulerY, -album.depth)]);
    this.label('Date', -t.rulerGap, t.rulerGap * 2, 0);
    this.label('Version', album.width + t.rulerGap, rulerY - t.rulerGap, 0);
    for (const tick of dateTicks(versions.flatMap(version => version.frames))) {
      const depth = this.frames.get(tick.id)?.plane.depth ?? 0;
      this.label(formatDate(tick.timestamp), -t.rulerGap * 2, 0, -depth);
    }
    for (const version of versions) this.label(`V${version.number}`, album.width + t.rulerGap * 2, rulerY, -(version.index + .5) * t.versionDepth);
    this.updateImages();
    this.span = Math.hypot(album.width + t.rulerGap * 4, t.maxImageHeight + t.rulerGap * 3, album.depth) * t.webgl.fitPadding;
    if (!this.initialized) {
      const center = new THREE.Vector3(album.width / 2, -t.maxImageHeight / 2, -album.depth / 2);
      this.controls.target.copy(center);
      this.camera.position.copy(center).add(new THREE.Vector3(...t.webgl.initialDirection).normalize().multiplyScalar(this.span * 2));
      this.controls.update();
      this.controls.saveState();
      this.initialized = true;
    }
    this.resize();
  }

  private updateImages() {
    const visible = new Set([...this.endpoints, ...(this.hovered ? [this.hovered] : [])]);
    this.pickTargets = this.pickTargets.filter(mesh => mesh.userData.version !== undefined);
    for (const [id, frame] of this.frames) {
      frame.image.visible = visible.has(id);
      frame.image.material.opacity = id === this.hovered ? 1 : t.endpointOpacity;
      frame.outline.color.set(id === this.hovered ? this.colors.ink : this.colors.line);
      if (!frame.image.visible) { frame.image.material.map = null; continue; }
      this.pickTargets.push(frame.image);
      const cached = this.textures.get(id);
      if (cached) { frame.image.material.map = cached; frame.image.material.needsUpdate = true; }
      else if (!this.pending.has(id) && !this.failedTextures.has(id)) {
        this.pending.add(id);
        new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}${frame.plane.frame.url}`, texture => {
          this.pending.delete(id);
          if (this.dead || !this.frames.has(id)) { texture.dispose(); return; }
          texture.colorSpace = THREE.SRGBColorSpace;
          texture.anisotropy = Math.min(t.webgl.anisotropyMax, this.renderer.capabilities.getMaxAnisotropy());
          this.textures.set(id, texture);
          this.updateImages();
          this.invalidate();
        }, undefined, () => { this.pending.delete(id); this.failedTextures.add(id); });
      }
    }
    for (const [id, texture] of this.textures) {
      if (this.textures.size <= t.webgl.textureCacheSize) break;
      if (!visible.has(id)) { texture.dispose(); this.textures.delete(id); }
    }
  }

  private clearContent() {
    this.content.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => material.dispose());
      }
    });
    this.content.clear(); this.frames.clear(); this.pickTargets = []; this.fades.clear();
    this.labels.forEach(label => label.element.remove()); this.labels = [];
  }
  dispose() {
    this.dead = true;
    cancelAnimationFrame(this.tick);
    this.observer.disconnect();
    this.controls.removeEventListener('change', this.controlChange);
    this.controls.dispose();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.pointerDown);
    canvas.removeEventListener('pointermove', this.pointerMove);
    canvas.removeEventListener('pointerup', this.pointerUp);
    canvas.removeEventListener('click', this.click);
    canvas.removeEventListener('pointercancel', this.pointerCancel);
    canvas.removeEventListener('pointerleave', this.pointerLeave);
    canvas.removeEventListener('keydown', this.keyDown);
    canvas.removeEventListener('webglcontextlost', this.contextLost);
    this.clearContent();
    this.textures.forEach(texture => texture.dispose());
    this.textures.clear();
    this.renderer.dispose();
    this.inspectionLabel.remove();
    canvas.remove();
  }
}
