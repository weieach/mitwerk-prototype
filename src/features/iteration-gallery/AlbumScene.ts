import { galleryRenderRatio } from './render-quality';
import { annotationBookmarkColor } from '../annotations/appearance';
import { interpolateOrbit } from './camera-motion';
import { tokenUsageArea } from './token-usage';
import * as THREE from 'three';
import { dragAngles, transitionProgress, theaterEntranceDuration, theaterRotationProgress } from './theater-transition';
import type { TheaterOrbit, TheaterTarget } from './theater-transition';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { GalleryVersion } from './model';
import { galleryBranchPaint, dateTicks, edgePanArmed, edgePanStrength, formatDate, formatVersion } from './model';
import type { buildAlbum, FramePlane, LabelFace } from './geometry';
import { albumAxisContent, albumBlockBounds, albumFloorY, containingBlock, dateLabelPose, featuredFrameAxis, featuredTickLength, defaultFrameFocus, frameFocus, resetCameraDestination, versionLabelPose } from './geometry';
import { galleryTokens as t } from './tokens';
import { workStateTokens } from '../../shared/work-state';
import { prefetchedCaptures } from './capture-cache';
import { axisSlotKey, axisTopBlend, mergeAxisAnchors, overheadDatePosition, projectAxisLabels, withOverheadDates } from './axis-label-layout';
import { observeTheme, resolveColor } from '../../shared/theme';
import type { AxisAnchor, AxisLabel } from './axis-label-layout';

type Album = ReturnType<typeof buildAlbum>;
type FrameObject = { plane: FramePlane; group: THREE.Group; image: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; outline: THREE.LineBasicMaterial };
type Callbacks = { annotate: (id: string) => void; tokenView: (active: boolean) => void; motion: (progress: number) => void; hover: (id: string | null) => void; open: (id: string) => void; zoom: (value: number) => void; error: (message: string) => void; labels: (labels: AxisLabel[]) => void };

/** Owns GPU resources and controls; React owns the data, filters and theater selection. */
const unitScale = new THREE.Vector3(1, 1, 1);
/** New version blocks grow along the date axis; new frames grow from their centers. */
const blockGrowthScale = new THREE.Vector3(1, 1, .001);
const frameGrowthScale = new THREE.Vector3(.6, .6, 1);
/** Ruler ticks start as a point at the album and extend to full length. */
const tickGrowthScale = new THREE.Vector3(.001, .001, .001);

export class AlbumScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, .1, 100_000);
  private controls: OrbitControls;
  private content = new THREE.Group();
  private tokenGroup = new THREE.Group();
  private tokenAnchors: AxisAnchor[] = [];
  private axisMeasure = document.createElement('canvas').getContext('2d')!;
  private tokenBlend = 0;
  private tokenActive = false;
  private topMotion: ((time: number) => boolean) | null = null;
  private axisAnchors: AxisAnchor[] = [];
  private featuredAnchors: AxisAnchor[] = [];
  private featuredGuides = new THREE.Group();
  private bookmarks: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>[] = [];
  private annotationCounts: ReadonlyMap<string, number> = new Map();
  private pickedBookmark = false;
  private frames = new Map<string, FrameObject>();
  private blockEdges = new Map<string, { block: Album['blocks'][number]; material: LineMaterial; edges: LineSegments2 }>();
  private pickTargets: THREE.Mesh[] = [];
  private textures = new Map<string, THREE.Texture>();
  private pending = new Set<string>();
  private prefetchQueue: { id: string; url: string }[] = [];
  private prefetching = 0;
  private fades = new Map<THREE.Material, { opacity: number; target: number }>();
  /** Frames and blocks easing from their previous placement (or from nothing) after a data change. */
  private growth: { object: THREE.Object3D; base: THREE.Vector3; offset: THREE.Vector3; scaleFrom: THREE.Vector3; start: number }[] = [];
  private growing = false;
  private arrival: { start: number; rise: number; items: { object: THREE.Object3D; base: number }[]; materials: { material: THREE.Material; opacity: number }[] } | null = null;
  private retired: THREE.Object3D[] = [];
  private ticks = new Map<string, THREE.Line>();
  private rulerGuides: { slot: string; lines: THREE.Line[] }[] = [];
  private observer: ResizeObserver;
  private raycaster = new THREE.Raycaster();
  private hovered: string | null = null;
  private pinned: string | null = null;
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
  private overheadBlend = 0;
  private failedTextures = new Set<string>();
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  private colors!: { paper: string; ink: string; muted: string; line: string; onPale: string };
  /** Resting capture opacity; translucency over a dark page reads as dimming, so the theme sets it. */
  private captureOpacity: number = t.endpointOpacity;
  private lastUpdate: Parameters<AlbumScene['update']> | null = null;
  private stopThemeObserver: () => void;

  constructor(private host: HTMLDivElement, private callbacks: Callbacks) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(galleryRenderRatio(host.clientWidth, host.clientHeight, devicePixelRatio, this.renderer.capabilities.maxTextureSize));
    this.readColors();
    void document.fonts.ready.then(() => this.invalidate());
    this.stopThemeObserver = observeTheme(this.themeChange);
    const canvas = this.renderer.domElement;
    canvas.tabIndex = 0;
    canvas.setAttribute('aria-label', '3D iteration gallery. Drag to rotate. Scroll to zoom. Right drag to pan. Arrow keys rotate; Home resets the view; T frames the top view.');
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
    window.addEventListener('resize', this.resize);
  }

  /** WebGL and canvas textures need resolved colors, so read them from the current theme tokens. */
  private readColors() {
    const css = getComputedStyle(this.host);
    const token = (name: string) => css.getPropertyValue(name).trim();
    this.colors = { paper: token('--paper'), ink: token('--ink'), muted: token('--muted'), line: token('--line-strong'), onPale: token('--on-pale') };
    this.captureOpacity = Number.parseFloat(token('--gallery-capture-opacity')) || t.endpointOpacity;
    this.renderer.setClearColor(this.colors.paper);
  }
  private themeChange = () => {
    this.readColors();
    if (this.lastUpdate) this.update(...this.lastUpdate);
    this.invalidate();
  };

  private invalidate = () => { if (!this.dead && !this.tick) this.tick = requestAnimationFrame(this.render); };
  private render = (time: number) => {
    this.tick = 0;
    if (this.dead) return;
    if (this.theaterTurn) { this.theaterTurn(time); return; }
    const dt = Math.min(64, time - (this.lastTime || time));
    this.lastTime = time;
    const blend = this.reducedMotion ? 1 : 1 - Math.exp(-dt / (t.transitionMs / 3));
    let moving = this.topMotion?.(time) ?? false;
    if (this.pointer && !this.down && this.album) {
      this.inspect(this.pick(this.pointer));
      const rect = this.host.getBoundingClientRect();
      const strength = this.overBlock && !this.tokenActive ? edgePanStrength(this.pointer.clientX - rect.left, this.pointer.clientY - rect.top, rect.width, rect.height) : 0;
      this.edgeHoldMs = strength > 0 ? this.edgeHoldMs + dt : 0;
      const armed = edgePanArmed(this.edgeHoldMs);
      this.edgeVelocity += ((armed ? strength : 0) * t.edgePan.speed - this.edgeVelocity) * (1 - Math.exp(-dt / t.edgePan.accelerationMs));
      const end = Math.max(...this.album.planes.map(plane => plane.depth), 0);
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
    if (this.growth.length) {
      const clock = performance.now();
      this.growth = this.growth.filter(item => {
        const { eased, complete } = transitionProgress(clock - item.start, this.reducedMotion ? 0 : workStateTokens.growMs);
        item.object.position.copy(item.base).addScaledVector(item.offset, 1 - eased);
        item.object.scale.lerpVectors(item.scaleFrom, unitScale, eased);
        return !complete;
      });
      moving = true;
    }
    for (const [id, frame] of this.frames) {
      const target = id === this.hovered ? t.hoverLift : 0;
      frame.group.position.y += (target - frame.group.position.y) * blend;
      if (Math.abs(target - frame.group.position.y) < .05) frame.group.position.y = target; else moving = true;
    }
    if (this.arrival) {
      const arrival = this.arrival;
      const elapsed = performance.now() - arrival.start - (this.reducedMotion ? 0 : t.arrival.holdMs);
      const { eased, complete } = transitionProgress(Math.max(0, elapsed), this.reducedMotion ? 0 : t.arrival.durationMs);
      for (const item of arrival.items) item.object.position.y = item.base + arrival.rise * (1 - eased);
      for (const item of arrival.materials) { item.material.transparent = true; item.material.opacity = item.opacity * eased; }
      if (complete) this.finishArrival(); else moving = true;
    }
    for (const bookmark of this.bookmarks) {
      const target = bookmark.userData.restY + (bookmark.userData.frameId === this.hovered ? t.annotations.hoverLift : 0);
      bookmark.position.y += (target - bookmark.position.y) * (this.reducedMotion ? 1 : blend);
      if (Math.abs(target - bookmark.position.y) < .05) bookmark.position.y = target; else moving = true;
    }
    if (this.syncTopView(dt)) moving = true;
    if (this.syncTokenUsage(dt)) moving = true;
    this.renderer.render(this.scene, this.camera);
    if (this.retired.length) this.release(this.retired.splice(0));
    this.host.dataset.imagesReady = String([...this.frames.values()].filter(frame => frame.image.visible).every(frame => !!frame.image.material.map));
    const axisFamily = getComputedStyle(this.host).fontFamily;
    const measureAxisText = (text: string, size: number) => {
      this.axisMeasure.font = `${size}px ${axisFamily}`;
      return this.axisMeasure.measureText(text).width;
    };
    this.callbacks.labels([
      ...projectAxisLabels(withOverheadDates(mergeAxisAnchors(this.axisAnchors, this.featuredAnchors), this.album ? albumFloorY(this.album) : 0, this.album ? -albumBlockBounds(this.album).max.z : undefined), this.camera, this.host.clientWidth, this.host.clientHeight, this.overheadBlend, this.tokenBlend, measureAxisText),
      ...projectAxisLabels(this.tokenAnchors, this.camera, this.host.clientWidth, this.host.clientHeight).map(label => ({ ...label, opacity: this.tokenBlend, hidden: label.hidden || this.tokenBlend < .01 })),
    ]);
    const hovered = this.hovered ? this.frames.get(this.hovered) : undefined;
    this.host.dataset.inspectionReady = String(!!hovered && this.textures.has(hovered.plane.frame.id) && hovered.group.position.y === t.hoverLift && (!edgePanArmed(this.edgeHoldMs) || this.lookSettled(hovered.plane)));
    if (moving) this.invalidate();
  };
  /**
   * Leave a held Playback turn without the reverse animation — e.g. the capture bucket changed while in Playback.
   * Otherwise the scene keeps replaying the finished turn, drawing the old frame with its controls disabled.
   */
  releaseTheater() {
    if (!this.theaterTurn && !this.restoreAlbum) return;
    this.restoreAlbum?.(); this.restoreAlbum = null; this.theaterTurn = null;
    this.controls.enabled = true;
    delete this.host.dataset.transitionProgress; delete this.host.dataset.transitionReady;
    this.updateImages();
    this.invalidate();
  }

  /** Live-update demo: hide the newest active frame, then drop it in from half its height above while it fades in. */
  replayLatestArrival() {
    if (this.theaterTurn || !this.album) return;
    const latest = this.album.planes.filter(plane => plane.active).at(-1);
    const frame = latest && this.frames.get(latest.frame.id);
    if (!frame) return;
    this.finishArrival();
    this.arrival = {
      start: performance.now(), rise: frame.plane.height * t.arrival.rise,
      items: [...frame.group.children].map(object => ({ object, base: object.position.y })),
      materials: [frame.image.material, frame.outline].map(material => ({ material, opacity: material.opacity })),
    };
    this.invalidate();
  }
  private finishArrival() {
    if (!this.arrival) return;
    for (const item of this.arrival.items) item.object.position.y = item.base;
    for (const item of this.arrival.materials) item.material.opacity = item.opacity;
    this.arrival = null;
  }

  turnToTheater(id: string, target: TheaterTarget, complete: () => void, freezeAt?: number, reverse = false, started?: () => void) {
    // Returning to the gallery lands on the camera the person left it with (same zoom scale).
    // Only a Playback opened without an album pose (e.g. a direct capture) falls back to Reset view.
    const keepCamera = reverse && !!this.restoreAlbum;
    if (reverse) {
      this.restoreAlbum?.();
      this.theaterTurn = null;
      if (!keepCamera) this.applyResetCamera();
    }
    const selected = this.frames.get(id);
    if (!selected) { complete(); return; }
    if (this.theaterTurn) return;
    this.topMotion = null;
    this.pointer = null; this.down = null; this.edgeVelocity = 0; this.controls.enabled = false;
    this.inspect(id);
    this.featuredGuides.visible = false;
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
      // Cold loads must decode the frame before starting either entrance stage.
      // Reverse likewise keeps the DOM image until its GPU counterpart is ready.
      if (!ready) { this.invalidate(); return; }
      if (start === null) {
        // Upload the selected capture before starting the motion clock. A cold GPU
        // texture must not consume the first part of the camera interpolation.
        // Frames outside the starting camera can enter its frustum mid-turn.
        // Prepare all attached capture maps now, not on their first animated draw.
        for (const frame of this.frames.values()) {
          if (frame.image.visible && frame.image.material.map) this.renderer.initTexture(frame.image.material.map);
        }
        this.renderer.render(this.scene, this.camera);
        start = performance.now(); started?.(); this.invalidate(); return;
      }
      const duration = reverse ? t.theaterMotion.rotateMs : theaterEntranceDuration();
      const clock = transitionProgress(time - start, this.reducedMotion ? 0 : duration, freezeAt);
      const { progress, complete: finished } = clock;
      const rotation = reverse ? clock : theaterRotationProgress(progress);
      const forwardEase = rotation.eased;
      const eased = reverse ? 1 - forwardEase : forwardEase;
      this.callbacks.motion(reverse ? 1 - progress : progress);
      this.camera.position.lerpVectors(fromPosition, destination, eased);
      this.camera.quaternion.slerpQuaternions(fromRotation, new THREE.Quaternion(), eased);
      this.camera.zoom = 1;
      [this.camera.left, this.camera.right, this.camera.top, this.camera.bottom] = fromFrustum.map((value, i) => THREE.MathUtils.lerp(value, toFrustum[i], eased));
      this.camera.updateProjectionMatrix();
      selected.group.position.y = originalLift * (1 - eased);
      selected.image.scale.x = THREE.MathUtils.lerp(1, imageScale, eased);
      selected.image.material.opacity = THREE.MathUtils.lerp(originalOpacity, 1, eased);
      this.host.style.setProperty('--token-usage-opacity', String(this.tokenBlend * (1 - eased)));
      const axisOpacity = 1 - transitionProgress((reverse ? 1 - progress : rotation.progress) * t.theaterMotion.rotateMs, t.theaterMotion.verticalAxisFadeMs).eased;
      for (const [material, opacity] of otherMaterials) {
        material.opacity = opacity * (material.userData.axisFace === 'wall' ? axisOpacity : 1 - eased);
      }
      this.renderer.render(this.scene, this.camera);
      this.host.dataset.transitionProgress = String(progress);
      this.host.dataset.transitionReady = String(freezeAt !== undefined && progress === freezeAt && ready);
      if (finished && ready) {
        if (reverse) {
          restore(); this.restoreAlbum = null; this.theaterTurn = null;
          if (keepCamera) { this.inspect(null); this.resize(); this.callbacks.zoom(this.camera.zoom); }
          else this.reset(true);
          this.controls.enabled = true;
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
    this.featuredGuides.visible = false;
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

  private reportedZoom = Number.NaN;
  private controlChange = () => {
    if (this.camera.zoom !== this.reportedZoom) {
      this.reportedZoom = this.camera.zoom;
      this.callbacks.zoom(this.camera.zoom);
    }
    this.invalidate();
  };
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
    const ratio = galleryRenderRatio(width, height, devicePixelRatio, this.renderer.capabilities.maxTextureSize);
    if (this.renderer.getPixelRatio() !== ratio) this.renderer.setPixelRatio(ratio);
    if (this.renderer.domElement.width !== Math.floor(width * ratio) || this.renderer.domElement.height !== Math.floor(height * ratio)) this.renderer.setSize(width, height);
    this.host.dataset.renderRatio = String(ratio);
    this.syncEdgeResolution();
    // setSize clears the drawing buffer. Draw now, before the browser paints, so a resize never shows an empty frame.
    this.renderer.render(this.scene, this.camera);
    this.invalidate();
  };
  private contextLost = (event: Event) => { event.preventDefault(); this.callbacks.error('The 3D view lost its graphics connection. Reload the page to restore it. You can still open frames below.'); };
  private keyDown = (event: KeyboardEvent) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 't', 'T'].includes(event.key)) return;
    event.preventDefault();
    if (event.key.toLowerCase() === 't') this.top();
    else if (event.key === 'Home') this.reset();
    else {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') this.controls.rotateLeft((event.key === 'ArrowLeft' ? 1 : -1) * t.webgl.keyRotateRadians);
      else this.controls.rotateUp((event.key === 'ArrowUp' ? 1 : -1) * t.webgl.keyRotateRadians);
      this.controls.update();
    }
  };
  private pointerDown = (event: PointerEvent) => {
    this.topMotion = null; this.controls.enabled = true;
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
      if (id) { if (this.pickedBookmark) this.callbacks.annotate(id); else this.callbacks.open(id); }
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
    const bookmark = hits.find(item => item.object.userData.annotation && this.frames.get(item.object.userData.frameId)?.plane.active);
    this.pickedBookmark = !!bookmark;
    const hit = bookmark ?? hits.find(item => item.object.userData.version !== undefined) ?? hits[0];
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

  setAnnotations(counts: ReadonlyMap<string, number>) {
    this.annotationCounts = counts;
    this.syncBookmarks();
  }

  private syncBookmarks() {
    for (const mesh of this.bookmarks) {
      mesh.removeFromParent(); mesh.geometry.dispose(); mesh.material.map?.dispose(); mesh.material.dispose();
      this.pickTargets = this.pickTargets.filter(target => target !== mesh);
    }
    this.bookmarks = [];
    const branches = [...new Set([...this.frames.values()].map(item => item.plane.frame.branch).filter((branch): branch is string => !!branch))];
    for (const [id, count] of this.annotationCounts) {
      const frame = this.frames.get(id);
      if (!frame || frame.plane.frame.kind === 'push') continue;
      const { plane, group } = frame;
      const color = annotationBookmarkColor(plane.frame.branch, branches, resolveColor);
      let map: THREE.CanvasTexture | null = null;
      if (count > 1) {
        const canvas = document.createElement('canvas');
        canvas.width = t.annotations.bookmarkTextureSize;
        canvas.height = Math.round(canvas.width * t.annotations.bookmarkHeight / t.annotations.bookmarkWidth);
        const context = canvas.getContext('2d')!;
        context.fillStyle = color; context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = this.colors.onPale;
        const rootStyle = getComputedStyle(document.documentElement);
        context.font = `${rootStyle.getPropertyValue('--strong-font-weight').trim() || 500} ${canvas.height * .6}px ${rootStyle.getPropertyValue('--sans') || 'sans-serif'}`;
        context.textAlign = 'center'; context.textBaseline = 'middle';
        context.fillText(String(count), canvas.width / 2, canvas.height / 2, canvas.width * .85);
        map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      }
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(t.annotations.bookmarkWidth, t.annotations.bookmarkHeight),
        new THREE.MeshBasicMaterial({ color: map ? '#fff' : color, map, side: THREE.DoubleSide, transparent:true, opacity:plane.active ? 1 : t.disabledOpacity }));
      mesh.position.set(plane.x + t.annotations.bookmarkInset + t.annotations.bookmarkWidth / 2,
        -plane.y + t.annotations.bookmarkHeight / 2, -plane.depth);
      mesh.userData.frameId = id; mesh.userData.annotation = true; mesh.userData.restY = mesh.position.y;
      group.add(mesh); this.bookmarks.push(mesh); this.pickTargets.push(mesh);
    }
    this.invalidate();
  }

  inspect(id: string | null) {
    if (this.theaterTurn) return;
    if (id && !this.frames.get(id)?.plane.active) id = null;
    if (id === this.hovered) return;
    this.hovered = id;
    this.callbacks.hover(id);
    this.syncFeaturedLabels();
    this.syncBlockStrokes();
    this.updateImages();
    this.invalidate();
  }
  pin(id: string | null) {
    if (this.theaterTurn) return;
    this.pinned = id && this.frames.get(id)?.plane.active ? id : null;
    this.syncFeaturedLabels();
    this.invalidate();
  }
  private featuredId() {
    return this.hovered ?? this.pinned;
  }
  private hoveredBlockKey() {
    const plane = this.hovered ? this.frames.get(this.hovered)?.plane : undefined;
    return plane && this.album ? containingBlock(this.album, plane)?.key ?? null : null;
  }
  private syncBlockStrokes() {
    const hoveredKey = this.hoveredBlockKey();
    for (const [key, { block, material }] of this.blockEdges) {
      const highlighted = key === hoveredKey;
      material.color.set(highlighted ? this.colors.ink : this.colors.muted);
      material.linewidth = highlighted ? t.webgl.hoverEdgeWidth : t.webgl.edgeWidth;
      const target = !block.active ? t.disabledOpacity * t.webgl.disabledOutlineScale : highlighted ? t.webgl.hoverEdgeOpacity : t.webgl.edgeOpacity;
      const fade = this.fades.get(material);
      if (fade) fade.target = target;
      else material.opacity = target;
    }
  }
  private syncEdgeResolution() {
    const { width, height } = this.renderer.domElement;
    for (const { material } of this.blockEdges.values()) material.resolution.set(width, height);
  }
  private syncFeaturedLabels() {
    this.clearFeaturedGuides();
    this.rulerGuides.forEach(guide => guide.lines.forEach(line => { line.visible = true; }));
    this.featuredAnchors = [];
    this.featuredGuides.visible = !this.theaterTurn;
    const frame = this.featuredId() ? this.frames.get(this.featuredId()!) : undefined;
    if (!frame || !frame.plane.active || !this.album) return;
    const pair = featuredFrameAxis(this.album, frame.plane);
    this.featuredAnchors = [
      { id: 'featured:date', text: pair.date.text, position: new THREE.Vector3(pair.date.x, pair.date.y, pair.date.z), face: pair.date.face, timestamp: frame.plane.frame.timestamp, featured: true },
      { id: 'featured:version', text: pair.version.text, position: new THREE.Vector3(pair.version.x, pair.version.y, pair.version.z), face: pair.version.face, timestamp: frame.plane.frame.timestamp, featured: true },
    ];
    const occupied = new Set(this.featuredAnchors.map(anchor => axisSlotKey(anchor.face, anchor.position.z)));
    this.rulerGuides.forEach(guide => guide.lines.forEach(line => { line.visible = !occupied.has(guide.slot); }));
    const floor = albumFloorY(this.album);
    const tick = featuredTickLength();
    this.line([new THREE.Vector3(this.album.width, 0, pair.date.z), new THREE.Vector3(this.album.width, tick, pair.date.z)], 'wall', this.featuredGuides);
    this.line([new THREE.Vector3(0, floor, pair.version.z), new THREE.Vector3(-tick, floor, pair.version.z)], 'ground', this.featuredGuides);
  }
  private clearFeaturedGuides() {
    this.featuredGuides.traverse(object => {
      if (object instanceof THREE.Line) {
        object.geometry.dispose();
        const material = object.material;
        (Array.isArray(material) ? material : [material]).forEach(item => item.dispose());
      }
    });
    this.featuredGuides.clear();
  }
  zoomBy(direction: -1 | 0 | 1) {
    if (this.theaterTurn || this.topMotion) return;
    // React only displays zoom. Applying its delayed state back here can rewind a newer wheel event.
    const zoom = direction === 0 ? 1 : this.camera.zoom + direction * t.zoomStep;
    this.camera.zoom = THREE.MathUtils.clamp(zoom, t.zoomMin, t.zoomMax);
    this.camera.updateProjectionMatrix();
    this.controls.update();
    this.controlChange();
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
    // Use the shared right-facing oblique orientation for Center and Reset.
    const direction = new THREE.Vector3(...t.webgl.initialDirection)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), -THREE.MathUtils.degToRad(t.webgl.groundRotationDegrees));
    this.camera.position.copy(center).add(direction.normalize().multiplyScalar(distance));
    this.camera.zoom = 1;
    this.controls.update();
    this.callbacks.zoom(1);
    this.resize();
  }
  center() {
    if (this.tokenBlend > .99) { this.top(); return; }
    this.topMotion = null; this.controls.enabled = true;
    const latest = this.album?.planes.filter(plane => plane.active).at(-1) ?? this.album?.planes.at(-1);
    if (!latest || !this.album) return;
    this.frameView(this.lookAt(frameFocus(latest)),
      Math.max(this.album.blocks[0].width, this.album.blocks[0].height) * t.webgl.frontViewPadding / t.webgl.defaultScale, 'center');
    const viewUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const target = this.lookAt(defaultFrameFocus(latest, viewUp, this.camera.top - this.camera.bottom));
    const shift = target.clone().sub(this.controls.target);
    this.controls.target.copy(target);
    this.camera.position.add(shift);
    this.controls.update();
    this.resize();
  }
  /** Pan through the blocks before starting the existing frame-to-playback rotation. */
  focusFrame(id: string, complete: () => void) {
    const frame = this.frames.get(id);
    if (!frame) { complete(); return; }
    const center = this.lookAt(frameFocus(frame.plane));
    const offset = this.camera.position.clone().sub(this.controls.target);
    this.framing = 'center';
    this.pin(id);
    // Pan only: keep the person's zoom scale (and its readout) through Playback and back.
    this.animateCamera(center, center.clone().add(offset), this.span, () => {
      this.inspect(id);
      complete();
    }, this.camera.zoom);
  }
  /** Center all active blocks, with chronological depth running toward screen right. */
  top() {
    if (!this.album?.blocks.length) return;
    const inspected = this.hovered;
    const active = this.album.blocks.filter(block => block.active);
    const bounds = albumBlockBounds({ blocks: active.length ? active : this.album.blocks });
    const aspect = this.host.clientWidth / Math.max(1, this.host.clientHeight);
    const rail = t.rulerTickLength + t.rulerLabelGap;
    const endGap = Math.max(t.topView.titleEndGap, t.tokenUsage.labelGap);
    const vertical = Math.max(bounds.max.x - bounds.min.x + 2 * rail,
      (bounds.max.z - bounds.min.z + 2 * endGap) / aspect) * t.overviewPadding;
    const center = new THREE.Vector3(bounds.center.x, 0, bounds.center.z);
    const azimuth = THREE.MathUtils.degToRad(t.tokenUsage.clockwiseDegrees);
    const direction = new THREE.Vector3(Math.sin(azimuth) * 1e-6, 1, Math.cos(azimuth) * 1e-6).normalize();
    this.framing = 'center';
    this.animateCamera(center, center.clone().addScaledVector(direction, vertical * 2), vertical * Math.min(1, aspect), () => this.inspect(inspected));
  }

  private animateCamera(center: THREE.Vector3, position: THREE.Vector3, destinationSpan: number, complete = () => {}, destinationZoom = 1) {
    const origin = this.controls.target.clone();
    const fromOffset = this.camera.position.clone().sub(origin), toOffset = position.clone().sub(center);
    const span = this.span, zoom = this.camera.zoom;
    const began = performance.now();
    this.pointer = null; this.edgeVelocity = 0; this.inspect(null);
    this.controls.enabled = false;
    this.topMotion = time => {
      const { eased, complete: finished } = transitionProgress(time - began, this.reducedMotion ? 0 : t.tokenUsage.rotateMs);
      this.controls.target.copy(origin).lerp(center, eased);
      this.camera.position.copy(this.controls.target).add(interpolateOrbit(fromOffset, toOffset, eased));
      this.span = THREE.MathUtils.lerp(span, destinationSpan, eased);
      this.camera.zoom = THREE.MathUtils.lerp(zoom, destinationZoom, eased);
      this.controls.update(); this.resize();
      if (finished) { this.topMotion = null; this.controls.enabled = true; this.callbacks.zoom(this.camera.zoom); complete(); }
      return !finished;
    };
    this.invalidate();
  }
  reset(exitTokenView = false) {
    if (this.tokenActive && !exitTokenView) { this.top(); return; }
    const animate = this.tokenActive || this.topMotion !== null;
    this.topMotion = null; this.controls.enabled = true;
    if (!this.album) return;
    this.inspect(null);
    const dest = this.resetDestination();
    if (animate && dest) {
      this.framing = 'reset';
      this.animateCamera(dest.center, dest.position, dest.span);
    } else { this.applyResetCamera(); this.resize(); }
  }

  /** Fit all: glide to the Reset view of `frame` (default: the current album), or jump there for still captures. */
  fit(frame?: Album, animate = true) {
    const dest = this.resetDestination(frame);
    if (!dest || this.theaterTurn || this.tokenActive) return;
    this.controls.enabled = true;
    if (!animate) { this.topMotion = null; this.applyResetCamera(frame); this.resize(); return; }
    this.framing = 'reset';
    this.animateCamera(dest.center, dest.position, dest.span);
  }

  private resetDestination(frame = this.album) {
    if (!frame) return null;
    const dest = resetCameraDestination(frame);
    return { center: this.lookAt(dest.center), position: this.lookAt(dest.position), span: dest.span };
  }

  private applyResetCamera(frame = this.album) {
    const dest = this.resetDestination(frame);
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
      this.theaterTurn = null; this.controls.enabled = true; this.resize(); complete();
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
        this.theaterTurn = null; this.reset(true); this.controls.enabled = true;
        delete this.host.dataset.transitionProgress;
        complete();
        return;
      }
      this.invalidate();
    };
    this.invalidate();
  }

  /** Where frames and blocks sit now, including mid-motion, so a new layout eases from there. */
  private placements() {
    const placed = new Map<string, THREE.Vector3>();
    for (const [id, frame] of this.frames) placed.set(`frame:${id}`, frame.image.position.clone());
    for (const [key, { edges }] of this.blockEdges) placed.set(`box:${key}`, edges.position.clone());
    for (const [key, line] of this.ticks) placed.set(`tick:${key}`, line.position.clone());
    return placed;
  }
  private grow(key: string, objects: THREE.Object3D[], placed: Map<string, THREE.Vector3> | null, scaleFrom: THREE.Vector3) {
    if (!placed) return;
    const before = placed.get(key);
    const base = objects[0].position;
    if (before && before.distanceToSquared(base) < 1e-4) return;
    const offset = before ? before.clone().sub(base) : new THREE.Vector3();
    const from = before ? unitScale : scaleFrom;
    const start = performance.now();
    for (const object of objects) {
      this.growth.push({ object, base: object.position.clone(), offset, scaleFrom: from, start });
      object.position.add(offset);
      object.scale.copy(from);
    }
  }
  private fade(material: THREE.Material, opacity: number, old?: Map<string, number>, key = '') {
    material.transparent = true;
    material.depthWrite = false;
    const start = old?.get(key) ?? (this.growing ? 0 : opacity);
    material.opacity = start;
    this.fades.set(material, { opacity: start, target: opacity });
    material.userData.fadeKey = key;
  }
  private axisLabel(text: string, x: number, y: number, z: number, face: LabelFace, valueOrigin?: THREE.Vector3, timestamp?: number) {
    this.axisAnchors.push({ id: `${face}:${text}:${z}`, text, position: new THREE.Vector3(x, y, z), face, valueOrigin, timestamp });
  }

  private syncTopView(dt: number) {
    const target = axisTopBlend(this.camera);
    this.overheadBlend += (target - this.overheadBlend) * (this.reducedMotion ? 1 : 1 - Math.exp(-dt / (t.topView.dateFadeMs / 3)));
    const moving = Math.abs(target - this.overheadBlend) > .002;
    if (!moving) this.overheadBlend = target;
    this.content.traverse(object => {
      if (object instanceof THREE.Line && object.material instanceof THREE.LineBasicMaterial) {
        const face = object.material.userData.axisFace;
        if (face === 'wall' || face === 'overhead-date') {
          object.material.transparent = true;
          object.material.opacity = face === 'wall' ? 1 - this.overheadBlend : this.overheadBlend;
        }
      }
    });
    return moving;
  }
  /** Lines are anchored at their first point, so scaling one extends it from that end (see ruler ticks). */
  private line(points: THREE.Vector3[], face: LabelFace, parent = this.content) {
    const anchored = (material: THREE.LineBasicMaterial, line: THREE.Vector3[]) => {
      const object = new THREE.Line(new THREE.BufferGeometry().setFromPoints(line.map(point => point.clone().sub(line[0]))), material);
      object.position.copy(line[0]);
      parent.add(object);
      return object;
    };
    const material = new THREE.LineBasicMaterial({ color: this.colors.line });
    material.userData.axisFace = face;
    const lines = [anchored(material, points)];
    if (face === 'wall' && this.album) {
      const topMaterial = new THREE.LineBasicMaterial({ color: this.colors.line, transparent: true, opacity: this.overheadBlend });
      topMaterial.userData.axisFace = 'overhead-date';
      const floor = albumFloorY(this.album);
      lines.push(anchored(topMaterial, points.map(point => overheadDatePosition(point, floor))));
    }
    return lines;
  }
  /** A ruler tick runs from the album out to its label; new ticks extend outward while simulating. */
  private rulerTick(key: string, points: THREE.Vector3[], face: LabelFace, placed: Map<string, THREE.Vector3> | null) {
    const lines = this.line(points, face);
    this.rulerGuides.push({ slot: axisSlotKey(face, points[0].z), lines });
    this.ticks.set(key, lines[0]);
    this.grow(`tick:${key}`, lines, placed, tickGrowthScale);
  }

  update(album: Album, versions: GalleryVersion[], representatives: string[], grow = false, simulating = false) {
    this.album = album;
    this.lastUpdate = [album, versions, representatives, grow, simulating];
    this.finishArrival();
    const previous = new Map([...this.fades].map(([material, fade]) => [material.userData.fadeKey as string, fade.opacity]));
    const placed = grow ? this.placements() : null;
    this.clearContent(true);
    this.growth = [];
    this.growing = !!placed;
    this.hovered = null;
    this.callbacks.hover(null);
    this.representatives = new Set(representatives);
    // After the sampled frames, warm every other in-range capture newest-first so hover never waits on a fetch.
    this.prefetchQueue = album.planes
      .filter(plane => plane.active && !this.representatives.has(plane.frame.id))
      .sort((a, b) => b.frame.timestamp - a.frame.timestamp)
      .map(plane => ({ id: plane.frame.id, url: `${import.meta.env.BASE_URL}${plane.frame.url}` }))
      .filter(item => !prefetchedCaptures.has(item.url));
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
      const edgeMaterial = new LineMaterial({ color: this.colors.muted, linewidth: t.webgl.edgeWidth, transparent: true, depthWrite: false, worldUnits: false });
      this.fade(edgeMaterial, block.active ? t.webgl.edgeOpacity : t.disabledOpacity * t.webgl.disabledOutlineScale, previous, `edge:${block.key}`);
      const edges = new LineSegments2(new LineSegmentsGeometry().fromEdgesGeometry(new THREE.EdgesGeometry(geometry)), edgeMaterial);
      edges.position.copy(box.position);
      this.content.add(edges);
      this.blockEdges.set(block.key, { block, material: edgeMaterial, edges });
      this.grow(`box:${block.key}`, [box, edges], placed, blockGrowthScale);
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
      this.grow(`frame:${plane.frame.id}`, [image, edges], placed, frameGrowthScale);
    }
    this.growing = false;
    this.syncBookmarks();
    this.syncBlockStrokes();
    this.updateImages();
    if (!this.initialized) {
      this.center();
      this.initialized = true;
    }
    this.resize();
    this.paintGuides(versions, placed, simulating);
    if (this.growth.length) this.invalidate();
    this.paintTokenUsage();
    this.featuredGuides = new THREE.Group();
    this.content.add(this.featuredGuides);
    if (this.pinned && !this.frames.get(this.pinned)?.plane.active) this.pinned = null;
    this.syncFeaturedLabels();
  }

  private paintGuides(versions: GalleryVersion[], placed: Map<string, THREE.Vector3> | null = null, simulating = false) {
    if (!this.album) return;
    const album = this.album;
    const floor = albumFloorY(album);
    this.axisLabel('Date', album.width, t.rulerTickLength + t.rulerLabelGap + t.axisTitle.dateValueGap, -album.depth / 2, 'wall', new THREE.Vector3(album.width, t.rulerTickLength + t.rulerLabelGap, -album.depth / 2));
    this.axisLabel('Version', -t.rulerTickLength - t.rulerLabelGap - t.axisTitle.valueGap, floor, -album.depth / 2, 'ground', new THREE.Vector3(-t.rulerTickLength - t.rulerLabelGap, floor, -album.depth / 2));
    const axis = albumAxisContent(album, versions);
    for (const tick of dateTicks(axis.frames, { latestPrompt: !simulating })) {
      const depth = this.frames.get(tick.id)?.plane.depth;
      if (depth === undefined) continue;
      this.rulerTick(`date:${formatDate(tick.timestamp)}`, [new THREE.Vector3(album.width, 0, -depth), new THREE.Vector3(album.width, t.rulerTickLength, -depth)], 'wall', placed);
      const pose = dateLabelPose(depth, album);
      this.axisLabel(formatDate(tick.timestamp), pose.x, pose.y, pose.z, pose.face, undefined, tick.timestamp);
    }
    for (const version of axis.versions) {
      const pose = versionLabelPose(album, version.index);
      this.rulerTick(`version:${version.number}`, [new THREE.Vector3(0, floor, pose.z), new THREE.Vector3(-t.rulerTickLength, floor, pose.z)], 'ground', placed);
      this.axisLabel(formatVersion(version.number), pose.x, pose.y, pose.z, pose.face, undefined, Math.max(...version.frames.map(frame => frame.timestamp)));
    }
  }

  private paintTokenUsage() {
    if (!this.album) return;
    this.tokenGroup = new THREE.Group(); this.tokenAnchors = [];
    this.content.add(this.tokenGroup);
    const chart = tokenUsageArea(this.album.planes);
    const branches = [...new Set(this.album.planes.map(plane => plane.frame.branch).filter((branch): branch is string => !!branch))];
    const addShape = (points: { x: number; depth: number }[], color: THREE.Color, opacity: number, lift: number) => {
      const shape = new THREE.Shape(points.map(point => new THREE.Vector2(point.x, point.depth)));
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = t.tokenUsage.surfaceLift + lift;
      mesh.userData.opacity = opacity;
      mesh.renderOrder = lift;
      this.tokenGroup.add(mesh);
    };
    for (const segment of chart.segments) {
      const color = new THREE.Color(resolveColor(t.tokenUsage.areaColor));
      if (segment.branch !== 'main') color.lerp(new THREE.Color(resolveColor(galleryBranchPaint(segment.branch, branches))), t.tokenUsage.branchTint);
      addShape(segment.outline, color, t.tokenUsage.areaOpacity, 0);
    }
    for (const bar of chart.bars) {
      const left = bar.plane.depth - bar.width / 2, right = bar.plane.depth + bar.width / 2;
      addShape([{ x: chart.baseline, depth: left }, { x: chart.baseline + bar.height, depth: left },
        { x: chart.baseline + bar.height, depth: right }, { x: chart.baseline, depth: right }],
      new THREE.Color(resolveColor(galleryBranchPaint(bar.branch, branches))), t.tokenUsage.barOpacity, 1);
    }
    const last = chart.samples.at(-1)?.plane;
    if (last) for (const fraction of t.tokenUsage.scaleTicks) {
      this.tokenAnchors.push({ id: `tokens:${fraction}`, text: `${fraction * 100}%`, face: 'ground',
        position: new THREE.Vector3(chart.baseline + chart.height * fraction, t.tokenUsage.surfaceLift, -last.depth + t.tokenUsage.labelGap) });
    }
  }

  private syncTokenUsage(dt: number) {
    const outward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.camera.quaternion);
    const elevation = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(outward.y, -1, 1)));
    const target = THREE.MathUtils.smoothstep(elevation, t.tokenUsage.startDegrees, t.tokenUsage.fullDegrees);
    this.tokenBlend += (target - this.tokenBlend) * (this.reducedMotion ? 1 : 1 - Math.exp(-dt / (t.tokenUsage.fadeMs / 3)));
    const moving = Math.abs(target - this.tokenBlend) > .002;
    if (!moving) this.tokenBlend = target;
    const active = target > .5;
    this.controls.mouseButtons.LEFT = active ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    if (active !== this.tokenActive) { this.tokenActive = active; this.callbacks.tokenView(active); }
    this.tokenGroup.visible = this.tokenBlend > .001;
    const hoveredKey = this.hoveredBlockKey();
    for (const [key, { block, material, edges }] of this.blockEdges) {
      // Paint the wireframe last in token view so the filled area cannot bury it.
      edges.renderOrder = this.tokenBlend > .001 ? t.tokenUsage.outlineRenderOrder : 0;
      material.depthTest = this.tokenBlend <= .001;
      const highlighted = key === hoveredKey;
      const baseWidth = highlighted ? t.webgl.hoverEdgeWidth : t.webgl.edgeWidth;
      material.linewidth = THREE.MathUtils.lerp(baseWidth, Math.max(baseWidth, t.tokenUsage.outlineWidth), this.tokenBlend);
      const baseOpacity = this.fades.get(material)?.opacity ?? (block.active ? t.webgl.edgeOpacity : t.disabledOpacity * t.webgl.disabledOutlineScale);
      material.opacity = THREE.MathUtils.lerp(baseOpacity, block.active ? Math.max(baseOpacity, t.tokenUsage.outlineOpacity) : t.disabledOpacity * t.webgl.disabledOutlineScale, this.tokenBlend);
    }
    for (const mesh of this.tokenGroup.children) if (mesh instanceof THREE.Mesh) mesh.material.opacity = this.tokenBlend * mesh.userData.opacity;
    this.host.style.setProperty('--token-usage-opacity', String(this.tokenBlend));
    this.host.dataset.tokenUsageReady = String(this.tokenBlend > .99 && !this.topMotion);
    return moving;
  }

  private updateImages() {
    const visible = new Set([...this.representatives, ...(this.hovered ? [this.hovered] : [])]);
    this.pickTargets = this.pickTargets.filter(mesh => mesh.userData.version !== undefined);
    for (const [id, frame] of this.frames) {
      // Background loads may finish during a turn; attach them only after return
      // so their GPU uploads cannot interrupt the selected frame's animation.
      if (this.theaterTurn && id !== this.hovered) continue;
      frame.image.visible = visible.has(id);
      frame.image.material.opacity = id === this.hovered ? 1 : this.captureOpacity;
      frame.outline.color.set(id === this.hovered ? this.colors.ink : this.colors.line);
      if (!frame.image.visible) { frame.image.material.map = null; frame.image.material.color.set(this.colors.paper); continue; }
      this.pickTargets.push(frame.image);
      const cached = this.textures.get(id);
      // A mapped capture is never tinted: the material color multiplies the texture, and a dark page would dim it.
      const url = `${import.meta.env.BASE_URL}${frame.plane.frame.url}`;
      const warmed = prefetchedCaptures.get(url);
      if (!cached && warmed) {
        const texture = new THREE.Texture(warmed);
        texture.needsUpdate = true;
        this.textures.set(id, this.prepareCapture(texture));
      }
      const ready = this.textures.get(id);
      if (ready) {
        if (frame.image.material.map !== ready) {
          frame.image.material.map = ready;
          frame.image.material.color.set(0xffffff);
          frame.image.material.needsUpdate = true;
        }
      }
      else if (!this.pending.has(id) && !this.failedTextures.has(id)) {
        this.pending.add(id);
        new THREE.TextureLoader().load(url, texture => {
          this.pending.delete(id);
          if (this.dead || !this.frames.has(id)) { texture.dispose(); return; }
          this.textures.set(id, this.prepareCapture(texture));
          if (!this.theaterTurn || id === this.hovered) { this.updateImages(); this.invalidate(); }
        }, undefined, () => { this.pending.delete(id); this.failedTextures.add(id); this.pumpPrefetch(); });
      }
    }
    for (const [id, texture] of this.textures) {
      if (this.textures.size <= t.webgl.textureCacheSize) break;
      if (!visible.has(id)) { texture.dispose(); this.textures.delete(id); }
    }
    this.pumpPrefetch();
  }

  private prepareCapture(texture: THREE.Texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
    // Keep original capture pixels; mipmaps and anisotropic filtering resolve the tilted planes.
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = Math.min(t.webgl.anisotropyMax, this.renderer.capabilities.getMaxAnisotropy());
    return texture;
  }

  /** Decodes queued captures only once every sampled frame has settled, so the resting album loads first. */
  private pumpPrefetch() {
    if (this.dead || this.theaterTurn || [...this.representatives].some(id => this.frames.has(id) && !this.textures.has(id) && !this.failedTextures.has(id))) return;
    while (this.prefetching < t.webgl.prefetchConcurrency && this.prefetchQueue.length) {
      const { url } = this.prefetchQueue.shift()!;
      if (prefetchedCaptures.has(url)) continue;
      this.prefetching++;
      const image = new Image();
      image.src = url;
      image.decode()
        .then(() => { prefetchedCaptures.set(url, image); })
        .catch(() => {})
        .finally(() => { this.prefetching--; this.pumpPrefetch(); });
    }
  }

  /**
   * Updates retire the previous content and free it only after the next frame has rendered, so the new
   * materials reuse its compiled shader programs. Cached capture textures belong to `textures` and are
   * never freed with a material, or every redraw would upload the captures to the GPU again.
   */
  private clearContent(retire = false) {
    const previous = [...this.content.children];
    if (retire) { this.retired.push(...previous); this.invalidate(); } else this.release(previous);
    this.axisAnchors = [];
    this.featuredAnchors = [];
    this.ticks.clear();
    this.rulerGuides = [];
    this.content.clear(); this.bookmarks = []; this.frames.clear(); this.blockEdges.clear(); this.pickTargets = []; this.fades.clear();
    this.featuredGuides = new THREE.Group();
  }
  private release(objects: THREE.Object3D[]) {
    const cached = new Set<THREE.Texture>(this.textures.values());
    for (const root of objects) root.traverse(object => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Line) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach(material => {
          if ('map' in material && material.map && !cached.has(material.map)) material.map.dispose();
          material.dispose();
        });
      }
    });
  }
  dispose() {
    this.dead = true;
    this.release(this.retired.splice(0));
    cancelAnimationFrame(this.tick);
    this.observer.disconnect();
    window.removeEventListener('resize', this.resize);
    this.stopThemeObserver();
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

    canvas.remove();
  }
}
