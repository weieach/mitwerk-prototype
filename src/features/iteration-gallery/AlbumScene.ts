import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { GalleryVersion } from './model';
import { dateTicks, edgePanArmed, edgePanStrength, formatDate, formatTime } from './model';
import type { buildAlbum, FramePlane, LabelFace } from './geometry';
import { albumFloorY, dateLabelPose, frameFocus, resetLook, versionLabelPose } from './geometry';
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
  private textures = new Map<string, THREE.Texture>();
  private pending = new Set<string>();
  private fades = new Map<THREE.Material, { opacity: number; target: number }>();
  private observer: ResizeObserver;
  private raycaster = new THREE.Raycaster();
  private hovered: string | null = null;
  private representatives = new Set<string>();
  private album: Album | null = null;
  private pointer: { clientX: number; clientY: number } | null = null;
  private overBlock = false;
  private edgeVelocity = 0;
  private edgeHoldMs = 0;
  private down: { x: number; y: number; pointer: number } | null = null;
  private dragged = false;
  private dead = false;
  private tick = 0;
  private lastTime = 0;
  private span = 1;
  private framing: 'center' | 'reset' = 'center';
  private buttons = 0;
  private initialized = false;
  private caption: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null = null;
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
    if (this.pointer && !this.down && this.album) {
      this.inspect(this.pick(this.pointer));
      const rect = this.host.getBoundingClientRect();
      const strength = this.overBlock ? edgePanStrength(this.pointer.clientX - rect.left, this.pointer.clientY - rect.top, rect.width, rect.height) : 0;
      this.edgeHoldMs = strength > 0 ? this.edgeHoldMs + dt : 0;
      const armed = edgePanArmed(this.edgeHoldMs);
      this.edgeVelocity += ((armed ? strength : 0) * t.edgePan.speed - this.edgeVelocity) * (1 - Math.exp(-dt / t.edgePan.accelerationMs));
      const end = this.album.planes.at(-1)?.depth ?? 0;
      const travel = Math.min(Math.max(0, end + this.controls.target.z), this.edgeVelocity * dt / 1000);
      if (travel > .001) {
        this.controls.target.z -= travel;
        this.camera.position.z -= travel;
        this.controls.update();
        moving = true;
      }
      if (armed && this.framing === 'center' && this.hovered && !this.buttons) {
        const focus = this.frames.get(this.hovered);
        if (focus && this.followLook(frameFocus(focus.plane), dt)) moving = true;
      }
    } else this.edgeHoldMs = 0;
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
    const hovered = this.hovered ? this.frames.get(this.hovered) : undefined;
    this.host.dataset.inspectionReady = String(!!hovered && this.textures.has(hovered.plane.frame.id) && hovered.group.position.y === t.hoverLift && (!edgePanArmed(this.edgeHoldMs) || this.lookSettled(hovered.plane)));
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
    this.buttons = event.buttons;
    this.pointer = null;
    this.edgeVelocity = 0;
    this.edgeHoldMs = 0;
    if (event.button !== 0) return;
    this.down = { x: event.clientX, y: event.clientY, pointer: event.pointerId };
    this.dragged = false;
  };
  private pointerMove = (event: PointerEvent) => {
    this.buttons = event.buttons;
    if (this.down) {
      this.dragged ||= Math.hypot(event.clientX - this.down.x, event.clientY - this.down.y) > t.webgl.dragThreshold;
      if (this.dragged) this.inspect(null);
    } else if (event.buttons === 0) {
      this.pointer = { clientX: event.clientX, clientY: event.clientY };
      this.inspect(this.pick(event));
      this.invalidate();
    }
  };
  private pointerUp = (event: PointerEvent) => {
    this.buttons = event.buttons;
    const down = this.down;
    this.down = null;
    this.pointer = { clientX: event.clientX, clientY: event.clientY };
    this.invalidate();
    if (!down || event.pointerId !== down.pointer) return;
    this.dragged ||= Math.hypot(event.clientX - down.x, event.clientY - down.y) > t.webgl.dragThreshold;
  };
  private click = (event: MouseEvent) => {
    if (!this.dragged) {
      const id = this.pick(event);
      if (id) this.callbacks.open(id);
    }
  };
  private pointerCancel = () => { this.down = null; this.dragged = false; this.buttons = 0; this.pointer = null; this.edgeVelocity = 0; this.edgeHoldMs = 0; this.inspect(null); };
  private pointerLeave = () => { this.pointer = null; this.edgeVelocity = 0; this.edgeHoldMs = 0; if (!this.down) { this.buttons = 0; this.inspect(null); } };
  private pick(event: Pick<MouseEvent, 'clientX' | 'clientY'>) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.raycaster.setFromCamera(new THREE.Vector2((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2), this.camera);
    const hits = this.raycaster.intersectObjects(this.pickTargets, false);
    // Stable slice targets prevent a newly lifted image from stealing the next hover.
    // Outside the block, the exposed image remains directly clickable.
    const hit = hits.find(item => item.object.userData.version !== undefined) ?? hits[0];
    this.overBlock = !!hit;
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
    this.placeCaption();
    this.updateImages();
    this.invalidate();
  }
  setZoom(zoom: number) {
    this.camera.zoom = THREE.MathUtils.clamp(zoom, t.zoomMin, t.zoomMax);
    this.camera.updateProjectionMatrix();
    this.invalidate();
  }
  private lookAt(point: { x: number; y: number; z: number }) {
    return new THREE.Vector3(point.x, point.y, point.z);
  }
  private lookSettled(plane: FramePlane) {
    if (this.framing !== 'center') return true;
    return this.controls.target.distanceTo(this.lookAt(frameFocus(plane))) <= t.edgePan.settle;
  }
  private snapLook(point: { x: number; y: number; z: number }) {
    this.followLook(point, Number.POSITIVE_INFINITY);
  }
  private followLook(point: { x: number; y: number; z: number }, dt: number) {
    const target = this.lookAt(point);
    const delta = target.sub(this.controls.target);
    if (delta.length() <= t.edgePan.settle / 4) return false;
    const blend = this.reducedMotion ? 1 : 1 - Math.exp(-dt / t.edgePan.followMs);
    this.controls.target.addScaledVector(delta, blend);
    this.camera.position.addScaledVector(delta, blend);
    this.controls.update();
    return true;
  }
  private frameView(center: THREE.Vector3, span: number, framing: 'center' | 'reset') {
    this.pointer = null; this.edgeVelocity = 0; this.edgeHoldMs = 0;
    this.inspect(null);
    this.framing = framing;
    this.span = span;
    this.controls.target.copy(center);
    const distance = Math.max(span, this.album?.depth ?? 0) * 2;
    this.camera.position.copy(center).add(new THREE.Vector3(...t.webgl.initialDirection).normalize().multiplyScalar(distance));
    this.camera.zoom = 1;
    this.controls.update();
    this.callbacks.zoom(1);
    this.resize();
  }
  center() {
    const first = this.album?.planes.find(plane => plane.active) ?? this.album?.planes[0];
    if (!first || !this.album) return;
    this.frameView(this.lookAt(frameFocus(first)),
      Math.max(this.album.blocks[0].width, this.album.blocks[0].height) * t.webgl.frontViewPadding, 'center');
  }
  reset() {
    if (!this.album) return;
    const look = resetLook(this.album);
    this.frameView(this.lookAt(look.center), look.span, 'reset');
  }

  private fade(material: THREE.Material, opacity: number, old?: Map<string, number>, key = '') {
    material.transparent = true;
    material.depthWrite = false;
    const start = old?.get(key) ?? opacity;
    material.opacity = start;
    this.fades.set(material, { opacity: start, target: opacity });
    material.userData.fadeKey = key;
  }
  private plate(text: string, x: number, y: number, z: number, face: LabelFace, ink = this.colors.muted, paper = '') {
    const mesh = this.makePlate(text, ink, paper);
    mesh.position.set(x, y, z);
    if (face === 'ground') mesh.rotation.x = -Math.PI / 2;
    if (face === 'wall') { mesh.rotation.y = Math.PI / 2; mesh.rotation.z = -Math.PI / 2; }
    this.content.add(mesh);
    return mesh;
  }
  private makePlate(text: string, ink: string, paper: string) {
    const { texture, width, height } = this.paintPlate(text, ink, paper);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
      map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }));
    mesh.userData.plate = { width, height };
    return mesh;
  }
  private paintPlate(text: string, ink: string, paper: string) {
    const scale = 2;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const font = `${t.labelFontSize * scale}px ${getComputedStyle(this.host).fontFamily || 'sans-serif'}`;
    ctx.font = font;
    const pad = 4 * scale;
    const lines = text.split('\n');
    const line = t.labelFontSize * scale * 1.25;
    const width = Math.ceil(Math.max(...lines.map(item => ctx.measureText(item).width)) + pad * 2);
    const height = Math.ceil(line * lines.length + pad * 2);
    canvas.width = width; canvas.height = height;
    ctx.font = font;
    if (paper) { ctx.fillStyle = paper; ctx.fillRect(0, 0, width, height); }
    ctx.fillStyle = ink;
    ctx.textBaseline = 'middle';
    lines.forEach((item, index) => ctx.fillText(item, pad, pad + line * (index + .5)));
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const worldH = t.labelWorldHeight + (paper ? 6 : 0);
    return { texture, width: worldH * width / height, height: worldH };
  }
  private placeCaption() {
    this.caption?.removeFromParent();
    const frame = this.hovered ? this.frames.get(this.hovered) : undefined;
    if (!frame) { if (this.caption) this.caption.visible = false; return; }
    const text = `V${frame.plane.frame.version} · ${formatTime(frame.plane.frame.timestamp)}\n${frame.plane.frame.summary.slice(0, t.labelSummaryLength)}`;
    if (this.caption) {
      this.caption.geometry.dispose();
      this.caption.material.map?.dispose();
      this.caption.material.dispose();
    }
    this.caption = this.makePlate(text, this.colors.ink, this.colors.paper);
    const { plane } = frame;
    const size = this.caption.userData.plate as { width: number; height: number };
    this.caption.position.set(plane.x + plane.width / 2, -plane.y + size.height / 2 + 3, -plane.depth);
    frame.group.add(this.caption);
    this.caption.visible = true;
  }
  private line(points: THREE.Vector3[]) {
    const material = new THREE.LineBasicMaterial({ color: this.colors.line });
    this.content.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }

  update(album: Album, versions: GalleryVersion[], representatives: string[]) {
    this.album = album;
    const previous = new Map([...this.fades].map(([material, fade]) => [material.userData.fadeKey as string, fade.opacity]));
    this.clearContent();
    this.hovered = null;
    this.callbacks.hover(null);
    this.representatives = new Set(representatives);
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
    const floor = albumFloorY(album);
    const wallHeight = Math.max(...album.blocks.map(block => block.height));
    this.plate('Date', -(t.rulerTickLength + t.rulerTitleGap), -t.rulerTitleGap, -album.depth / 2, 'wall');
    this.plate('Version', album.width + t.rulerTickLength + t.rulerTitleGap, floor, -album.depth / 2, 'ground');
    for (const tick of dateTicks(versions.flatMap(version => version.frames))) {
      const depth = this.frames.get(tick.id)?.plane.depth ?? 0;
      this.line([new THREE.Vector3(0, 0, -depth), new THREE.Vector3(0, -t.rulerTickLength, -depth)]);
      const pose = dateLabelPose(depth, wallHeight);
      this.plate(formatDate(tick.timestamp), pose.x, pose.y, pose.z, pose.face);
    }
    for (const version of versions) {
      const pose = versionLabelPose(album, version.index);
      this.line([new THREE.Vector3(album.width, floor, pose.z), new THREE.Vector3(album.width + t.rulerTickLength, floor, pose.z)]);
      this.plate(`V${version.number}`, pose.x, pose.y, pose.z, pose.face);
    }
    this.updateImages();
    if (!this.initialized) {
      this.center();
      this.initialized = true;
    }
    this.resize();
  }

  private updateImages() {
    const visible = new Set([...this.representatives, ...(this.hovered ? [this.hovered] : [])]);
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
        materials.forEach(material => {
          if ('map' in material && material.map) material.map.dispose();
          material.dispose();
        });
      }
    });
    this.content.clear(); this.frames.clear(); this.pickTargets = []; this.fades.clear(); this.caption = null;
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
    if (this.caption) {
      this.caption.geometry.dispose();
      this.caption.material.map?.dispose();
      this.caption.material.dispose();
      this.caption = null;
    }
    canvas.remove();
  }
}
