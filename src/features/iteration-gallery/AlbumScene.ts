import * as THREE from 'three';
import { dragAngles, transitionProgress } from './theater-transition';
import type { TheaterOrbit, TheaterTarget } from './theater-transition';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { GalleryVersion } from './model';
import { dateTicks, edgePanArmed, edgePanStrength, formatDate, formatFrameLabel } from './model';
import type { buildAlbum, FramePlane, LabelFace } from './geometry';
import { albumFloorY, dateLabelPose, frameFocus, hoverCaptionHeight, resetCameraDestination, versionLabelPose } from './geometry';
import { galleryTokens as t } from './tokens';
import { projectAxisLabels } from './axis-label-layout';
import type { AxisAnchor, AxisLabel } from './axis-label-layout';

type Album = ReturnType<typeof buildAlbum>;
type FrameObject = { plane: FramePlane; group: THREE.Group; image: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; outline: THREE.LineBasicMaterial };
type Callbacks = { hover: (id: string | null) => void; open: (id: string) => void; zoom: (value: number) => void; error: (message: string) => void; labels: (labels: AxisLabel[]) => void };

/** Owns GPU resources and controls; React owns the data, filters and theater selection. */
export class AlbumScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 100_000);
  private controls: OrbitControls;
  private content = new THREE.Group();
  private axisAnchors: AxisAnchor[] = [];
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
  private restoreAlbum: (() => void) | null = null;
  private theaterTurn: ((time: number) => void) | null = null;
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
    this.controls.zoomSpeed = t.webgl.zoomSpeed;
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
    if (this.theaterTurn) { this.theaterTurn(time); return; }
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
    this.callbacks.labels(projectAxisLabels(this.axisAnchors, this.camera, this.host.clientWidth, this.host.clientHeight));
    const hovered = this.hovered ? this.frames.get(this.hovered) : undefined;
    this.host.dataset.inspectionReady = String(!!hovered && this.textures.has(hovered.plane.frame.id) && hovered.group.position.y === t.hoverLift && (!edgePanArmed(this.edgeHoldMs) || this.lookSettled(hovered.plane)));
    if (moving) this.invalidate();
  };
  turnToTheater(id: string, target: TheaterTarget, complete: () => void, freezeAt?: number, reverse = false, started?: () => void) {
    if (reverse) {
      this.restoreAlbum?.();
      this.theaterTurn = null;
      this.applyResetCamera();
    }
    const selected = this.frames.get(id);
    if (!selected) { complete(); return; }
    if (this.theaterTurn) return;
    this.pointer = null; this.down = null; this.edgeVelocity = 0; this.controls.enabled = false;
    this.inspect(id);
    this.caption && (this.caption.visible = false);
    this.callbacks.labels([]);
    const rect = this.host.getBoundingClientRect();
    const centerX = target.left + target.width / 2 - rect.left;
    const centerY = target.top + target.height / 2 - rect.top;
    const unit = selected.plane.height / target.height;
    const fromPosition = this.camera.position.clone(), fromRotation = this.camera.quaternion.clone();
    const originalZoom = this.camera.zoom;
    const fromFrustum = [this.camera.left, this.camera.right, this.camera.top, this.camera.bottom].map(value => value / this.camera.zoom);
    const toFrustum = [-centerX * unit, (rect.width - centerX) * unit, centerY * unit, -(rect.height - centerY) * unit];
    const destination = selected.image.position.clone().add(new THREE.Vector3(0, 0, Math.max(this.span, this.album?.depth ?? 0) * 2));
    const originalLift = selected.group.position.y;
    const originalOpacity = selected.image.material.opacity;
    const imageScale = selected.plane.height * selected.plane.frame.width / selected.plane.frame.height / selected.plane.width;
    const otherMaterials = new Map<THREE.Material, number>();
    this.content.traverse(object => {
      if (!(object instanceof THREE.Mesh || object instanceof THREE.Line)) return;
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        if (material !== selected.image.material) { material.transparent = true; otherMaterials.set(material, material.opacity); }
      }
    });
    const restore = () => {
      this.camera.position.copy(fromPosition); this.camera.quaternion.copy(fromRotation);
      this.camera.zoom = originalZoom;
      [this.camera.left, this.camera.right, this.camera.top, this.camera.bottom] = fromFrustum.map(value => value * originalZoom);
      this.camera.updateProjectionMatrix();
      selected.group.position.y = originalLift; selected.image.scale.x = 1;
      selected.image.material.opacity = originalOpacity;
      for (const [material, opacity] of otherMaterials) material.opacity = opacity;
    };
    this.restoreAlbum = restore;
    let start: number | null = null;
    this.theaterTurn = time => {
      const ready = this.textures.has(id) || this.failedTextures.has(id);
      // Keep the DOM theater image visible until its GPU counterpart is ready.
      if (reverse && !ready) { this.invalidate(); return; }
      if (start === null) { start = time; started?.(); }
      const { progress, eased: forwardEase, complete: finished } = transitionProgress(time - start, this.reducedMotion ? 0 : t.theaterMotion.rotateMs, freezeAt);
      const eased = reverse ? 1 - forwardEase : forwardEase;
      this.camera.position.lerpVectors(fromPosition, destination, eased);
      this.camera.quaternion.slerpQuaternions(fromRotation, new THREE.Quaternion(), eased);
      this.camera.zoom = 1;
      [this.camera.left, this.camera.right, this.camera.top, this.camera.bottom] = fromFrustum.map((value, i) => THREE.MathUtils.lerp(value, toFrustum[i], eased));
      this.camera.updateProjectionMatrix();
      selected.group.position.y = originalLift * (1 - eased);
      selected.image.scale.x = THREE.MathUtils.lerp(1, imageScale, eased);
      selected.image.material.opacity = THREE.MathUtils.lerp(originalOpacity, 1, eased);
      const axisOpacity = 1 - transitionProgress((reverse ? 1 - progress : progress) * t.theaterMotion.rotateMs, t.theaterMotion.verticalAxisFadeMs).eased;
      for (const [material, opacity] of otherMaterials) {
        material.opacity = opacity * (material.userData.axisFace === 'wall' ? axisOpacity : 1 - eased);
      }
      this.renderer.render(this.scene, this.camera);
      this.host.dataset.transitionProgress = String(progress);
      this.host.dataset.transitionReady = String(freezeAt !== undefined && progress === freezeAt && ready);
      if (finished && ready) {
        if (reverse) {
          restore(); this.restoreAlbum = null; this.theaterTurn = null;
          this.reset(); this.controls.enabled = true; this.placeCaption();
          delete this.host.dataset.transitionProgress;
          this.invalidate();
        } else this.theaterTurn = () => {};
        complete(); return;
      }
      this.invalidate();
    };
    this.invalidate();
  }

  /** Hand off the contained DOM image to a freely orbiting camera, with no timed rotation. */
  beginTheaterOrbit(id: string, target: TheaterTarget, ready: () => void, complete: () => void): TheaterOrbit | null {
    this.restoreAlbum?.(); this.restoreAlbum = null; this.theaterTurn = null;
    const selected = this.frames.get(id);
    if (!selected || this.failedTextures.has(id)) return null;
    this.pointer = null; this.down = null; this.edgeVelocity = 0;
    this.controls.enabled = false;
    this.inspect(id);
    this.caption && (this.caption.visible = false);
    this.callbacks.labels([]);
    const rect = this.host.getBoundingClientRect();
    const unit = selected.plane.height / target.height;
    const height = rect.height * unit;
    const offset = new THREE.Vector3(
      (rect.left + rect.width / 2 - target.left - target.width / 2) * unit,
      (target.top + target.height / 2 - rect.top - rect.height / 2) * unit, 0);
    selected.group.position.y = t.hoverLift;
    const pivot = selected.image.position.clone().add(new THREE.Vector3(0, t.hoverLift, 0));
    selected.image.scale.x = selected.plane.height * selected.plane.frame.width / selected.plane.frame.height / selected.plane.width;
    const distance = Math.max(this.span, this.album?.depth ?? 0) * 2;
    this.span = height * Math.min(1, rect.width / rect.height);
    this.camera.zoom = 1;
    this.camera.left = -rect.width * unit / 2; this.camera.right = rect.width * unit / 2;
    this.camera.top = height / 2; this.camera.bottom = -height / 2;
    this.camera.updateProjectionMatrix();
    let dx = 0, dy = 0, revealed = false, ended = false;
    const render = () => {
      if (!this.textures.has(id) && !this.failedTextures.has(id)) { this.invalidate(); return; }
      const angles = dragAngles(dx, dy, rect.width, rect.height, t.theaterDrag.radiansPerViewport, t.theaterDrag.pitchLimit);
      const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(angles.pitch, angles.yaw, 0, 'YXZ'));
      const focus = pivot.clone().add(offset.clone().applyQuaternion(rotation));
      this.camera.position.copy(focus).add(new THREE.Vector3(0, 0, distance).applyQuaternion(rotation));
      this.camera.quaternion.copy(rotation);
      this.controls.target.copy(focus);
      this.renderer.render(this.scene, this.camera);
      this.host.dataset.orbitAngles = JSON.stringify(angles);
      if (!revealed) { revealed = true; ready(); }
      if (ended) {
        delete this.host.dataset.orbitAngles;
        this.animateToReset(complete);
      }
    };
    this.theaterTurn = render;
    this.invalidate();
    return {
      move: (x, y) => { dx = x; dy = y; this.invalidate(); },
      end: () => { ended = true; this.invalidate(); },
    };
  }

  private controlChange = () => { this.callbacks.zoom(this.camera.zoom); this.invalidate(); };
  private resize = () => {
    const width = this.host.clientWidth, height = this.host.clientHeight;
    if (!width || !height || this.theaterTurn) return;
    const aspect = width / height;
    const vertical = this.span / Math.min(1, aspect);
    this.camera.left = -vertical * aspect / 2;
    this.camera.right = vertical * aspect / 2;
    this.camera.top = vertical / 2;
    this.camera.bottom = -vertical / 2;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    if (this.hovered) this.placeCaption();
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
    if (this.theaterTurn) return;
    if (id && !this.frames.get(id)?.plane.active) id = null;
    if (id === this.hovered) return;
    this.hovered = id;
    this.callbacks.hover(id);
    this.placeCaption();
    this.updateImages();
    this.invalidate();
  }
  setZoom(zoom: number) {
    if (this.theaterTurn) return;
    this.camera.zoom = THREE.MathUtils.clamp(zoom, t.zoomMin, t.zoomMax);
    this.camera.updateProjectionMatrix();
    if (this.hovered) this.placeCaption();
    this.invalidate();
  }
  private lookAt(point: { x: number; y: number; z: number }) {
    return new THREE.Vector3(point.x, point.y, point.z);
  }
  private lookSettled(plane: FramePlane) {
    if (this.framing !== 'center') return true;
    return this.controls.target.distanceTo(this.lookAt(frameFocus(plane))) <= t.edgePan.settle;
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
    // Orbit the camera oppositely to give the album a counterclockwise ground-plane turn.
    const direction = new THREE.Vector3(...t.webgl.initialDirection)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), -THREE.MathUtils.degToRad(t.webgl.groundRotationDegrees));
    this.camera.position.copy(center).add(direction.normalize().multiplyScalar(distance));
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
    this.inspect(null);
    this.applyResetCamera();
    this.resize();
  }

  private resetDestination() {
    if (!this.album) return null;
    const dest = resetCameraDestination(this.album);
    return { center: this.lookAt(dest.center), position: this.lookAt(dest.position), span: dest.span };
  }

  private applyResetCamera() {
    const dest = this.resetDestination();
    if (!dest) return;
    this.framing = 'reset';
    this.span = dest.span;
    this.pointer = null; this.edgeVelocity = 0; this.edgeHoldMs = 0;
    this.controls.target.copy(dest.center);
    this.camera.position.copy(dest.position);
    this.camera.zoom = 1;
    this.controls.update();
    this.callbacks.zoom(1);
  }

  private animateToReset(complete: () => void) {
    const dest = this.resetDestination();
    if (!dest) {
      this.theaterTurn = null; this.controls.enabled = true; this.resize(); this.placeCaption(); complete();
      return;
    }
    this.inspect(null);
    const fromPosition = this.camera.position.clone();
    const fromRotation = this.camera.quaternion.clone();
    const fromTarget = this.controls.target.clone();
    const fromSpan = this.span;
    const toRotation = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().lookAt(dest.position, dest.center, new THREE.Vector3(0, 1, 0)));
    let start: number | null = null;
    this.theaterTurn = time => {
      if (start === null) start = time;
      const { eased, complete: finished } = transitionProgress(time - start, this.reducedMotion ? 0 : t.theaterMotion.rotateMs);
      this.camera.position.lerpVectors(fromPosition, dest.position, eased);
      this.camera.quaternion.slerpQuaternions(fromRotation, toRotation, eased);
      this.controls.target.lerpVectors(fromTarget, dest.center, eased);
      this.span = THREE.MathUtils.lerp(fromSpan, dest.span, eased);
      this.camera.zoom = 1;
      const width = this.host.clientWidth, height = this.host.clientHeight;
      if (width && height) {
        const vertical = this.span / Math.min(1, width / height);
        this.camera.left = -vertical * width / height / 2;
        this.camera.right = vertical * width / height / 2;
        this.camera.top = vertical / 2;
        this.camera.bottom = -vertical / 2;
        this.camera.updateProjectionMatrix();
      }
      this.renderer.render(this.scene, this.camera);
      this.host.dataset.transitionProgress = String(eased);
      if (finished) {
        this.theaterTurn = null; this.reset(); this.controls.enabled = true; this.placeCaption();
        delete this.host.dataset.transitionProgress;
        complete();
        return;
      }
      this.invalidate();
    };
    this.invalidate();
  }

  private fade(material: THREE.Material, opacity: number, old?: Map<string, number>, key = '') {
    material.transparent = true;
    material.depthWrite = false;
    const start = old?.get(key) ?? opacity;
    material.opacity = start;
    this.fades.set(material, { opacity: start, target: opacity });
    material.userData.fadeKey = key;
  }
  private axisLabel(text: string, x: number, y: number, z: number, face: LabelFace) {
    this.axisAnchors.push({ id: `${face}:${text}:${z}`, text, position: new THREE.Vector3(x, y, z), face });
  }

  private makePlate(text: string, ink: string, worldH: number) {
    const { texture, width, height } = this.paintPlate(text, ink, worldH);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({
      map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    }));
    mesh.userData.plate = { width, height };
    return mesh;
  }
  private paintPlate(text: string, ink: string, worldH: number) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const viewH = Math.max(1e-6, (this.camera.top - this.camera.bottom) / this.camera.zoom);
    const hostH = this.host.clientHeight || 1;
    const dpr = Math.min(devicePixelRatio, t.webgl.pixelRatioMax);
    const targetPx = Math.min(t.labelTextureMax, Math.max(t.labelTextureMin, worldH / viewH * hostH * dpr));
    const family = getComputedStyle(this.host).fontFamily || 'sans-serif';
    const lines = text.split('\n');
    const line = t.labelFontSize * 1.25;
    const pad = t.captionShadow.pad;
    ctx.font = `${t.labelFontSize}px ${family}`;
    const cssW = Math.max(...lines.map(item => ctx.measureText(item).width)) + pad * 2;
    const cssH = line * lines.length + pad * 2;
    const scale = targetPx / cssH;
    canvas.width = Math.ceil(cssW * scale);
    canvas.height = Math.ceil(cssH * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.font = `${t.labelFontSize}px ${family}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    // Transparent texture: a white halo follows only the glyphs, never a label rectangle.
    ctx.strokeStyle = t.captionShadow.color;
    ctx.lineWidth = t.captionShadow.stroke;
    ctx.lineJoin = 'round';
    ctx.shadowColor = t.captionShadow.color;
    ctx.shadowBlur = t.captionShadow.blur * scale;
    for (let pass = 0; pass < t.captionShadow.passes; pass++) {
      lines.forEach((item, index) => ctx.strokeText(item, pad, pad + line * (index + .5)));
    }
    ctx.shadowBlur = 0;
    ctx.fillStyle = ink;
    lines.forEach((item, index) => ctx.fillText(item, pad, pad + line * (index + .5)));
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(t.webgl.anisotropyMax, this.renderer.capabilities.getMaxAnisotropy());
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    return { texture, width: worldH * cssW / cssH, height: worldH };
  }
  private placeCaption() {
    this.caption?.removeFromParent();
    const frame = this.hovered ? this.frames.get(this.hovered) : undefined;
    if (!frame) { if (this.caption) this.caption.visible = false; return; }
    const text = `${formatFrameLabel(frame.plane.frame)}\n${frame.plane.frame.summary.slice(0, t.labelSummaryLength)}`;
    if (this.caption) {
      this.caption.geometry.dispose();
      this.caption.material.map?.dispose();
      this.caption.material.dispose();
    }
    const viewH = Math.max(1e-6, (this.camera.top - this.camera.bottom) / this.camera.zoom);
    this.caption = this.makePlate(text, this.colors.ink, hoverCaptionHeight(frame.plane.height, viewH));
    const { plane } = frame;
    const size = this.caption.userData.plate as { width: number; height: number };
    this.caption.position.set(plane.x + size.width / 2, -plane.y + t.hoverCaptionGap + size.height / 2, -plane.depth);
    frame.group.add(this.caption);
    this.caption.visible = true;
  }
  private line(points: THREE.Vector3[], face: LabelFace) {
    const material = new THREE.LineBasicMaterial({ color: this.colors.line });
    material.userData.axisFace = face;
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
    this.updateImages();
    if (!this.initialized) {
      this.center();
      this.initialized = true;
    }
    this.resize();
    this.paintGuides(versions);
  }

  private paintGuides(versions: GalleryVersion[]) {
    if (!this.album) return;
    const album = this.album;
    const floor = albumFloorY(album);
    this.axisLabel('Date', 0, t.rulerTickLength + t.rulerTitleGap, -album.depth / 2, 'wall');
    this.axisLabel('Version', album.width + t.rulerTickLength + t.versionTitleGap, floor, -album.depth / 2, 'ground');
    for (const tick of dateTicks(versions.flatMap(version => version.frames))) {
      const depth = this.frames.get(tick.id)?.plane.depth ?? 0;
      this.line([new THREE.Vector3(0, 0, -depth), new THREE.Vector3(0, t.rulerTickLength, -depth)], 'wall');
      const pose = dateLabelPose(depth);
      this.axisLabel(formatDate(tick.timestamp), pose.x, pose.y, pose.z, pose.face);
    }
    for (const version of versions) {
      const pose = versionLabelPose(album, version.index);
      this.line([new THREE.Vector3(album.width, floor, pose.z), new THREE.Vector3(album.width + t.rulerTickLength, floor, pose.z)], 'ground');
      this.axisLabel(`V${version.number}`, pose.x, pose.y, pose.z, pose.face);
    }
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
    this.axisAnchors = [];
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
