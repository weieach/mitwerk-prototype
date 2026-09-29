import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mergeAxisAnchors, projectAxisLabels } from '../src/features/iteration-gallery/axis-label-layout.ts';
import type { AxisAnchor } from '../src/features/iteration-gallery/axis-label-layout.ts';

const anchors: AxisAnchor[] = [{ id: 'date', text: 'Sep 22', position: new THREE.Vector3(0, 100, -200), face: 'wall' }];
function camera() {
  const camera = new THREE.OrthographicCamera(-500, 500, 500, -500, .1, 10000);
  camera.position.set(1000, 850, 1000); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
  return camera;
}
const matrix = (transform: string) => transform.slice(9, -1).split(',').map(Number);

test('zoom moves label anchors without shrinking or enlarging the text', () => {
  const view = camera();
  const before = projectAxisLabels(anchors, view, 800, 640)[0];
  view.zoom = .5; view.updateProjectionMatrix();
  const after = projectAxisLabels(anchors, view, 800, 640)[0];
  assert.equal(before.fontSize, after.fontSize);
  assert.deepEqual(matrix(before.transform).slice(0, 12), matrix(after.transform).slice(0, 12));
  assert.notDeepEqual(matrix(before.transform).slice(12, 14), matrix(after.transform).slice(12, 14));
});

test('date baselines follow the depth direction when the camera orbits', () => {
  const view = camera();
  for (const position of [[1000, 850, 1000], [800, 400, -1000]]) {
    view.position.set(...position as [number, number, number]); view.lookAt(0, 0, 0); view.updateMatrixWorld();
    const label = projectAxisLabels(anchors, view, 800, 640)[0];
    const values = matrix(label.transform);
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(view.quaternion.clone().invert());
    assert.ok(Math.abs(values[0] * -direction.y - values[1] * direction.x) < 1e-8);
    assert.ok(values.every(Number.isFinite));
  }
});

test('featured labels replace a standing tick at the same face and depth', () => {
  const date = new THREE.Vector3(0, 100, -200);
  const version = new THREE.Vector3(300, -80, -200);
  const merged = mergeAxisAnchors([
    { id: 'title', text: 'Date', position: date, face: 'wall' },
    { id: 'day', text: 'Sep 17', position: date, face: 'wall' },
    { id: 'slot', text: 'V7', position: version, face: 'ground' },
  ], [
    { id: 'featured:date', text: 'Sep 17, 7:33', position: date.clone(), face: 'wall', featured: true },
    { id: 'featured:version', text: 'V7', position: version.clone(), face: 'ground', featured: true },
  ]);
  assert.deepEqual(merged.map(anchor => anchor.id), ['title', 'featured:date', 'featured:version']);
  assert.equal(merged.find(anchor => anchor.id === 'title')?.text, 'Date');
});

test('viewport-based label sizes stay bounded on small and large panels', () => {
  const view = camera();
  const sizes = [200, 640, 1800].map(size => projectAxisLabels(anchors, view, size, size)[0].fontSize);
  assert.deepEqual(sizes, [8, 9, 11]);
});

// Camera orientation, rather than scene position, determines frontal readability.
test('axis labels unfold continuously toward the front, independently of zoom and elevation', async () => {
  const { axisFrontBlend, axisLabelRotation } = await import('../src/features/iteration-gallery/axis-label-layout.ts');
  const view = camera();
  const faceAt = (degrees: number, elevation = 400) => {
    const radians = THREE.MathUtils.degToRad(degrees);
    view.position.set(Math.sin(radians) * 1000, elevation, Math.cos(radians) * 1000);
    view.lookAt(0, 0, 0); view.updateMatrixWorld();
    return axisFrontBlend(view);
  };
  assert.equal(faceAt(45), 0);
  const partial = faceAt(21);
  assert.ok(partial > 0 && partial < 1);
  assert.ok(Math.abs(faceAt(-21, 900) - partial) < 1e-8);
  assert.equal(faceAt(0), 1);
  for (const face of ['ground', 'wall'] as const) {
    const normal = new THREE.Vector3(0, 0, 1).applyEuler(axisLabelRotation(face, 1));
    assert.ok(normal.distanceTo(new THREE.Vector3(0, 0, 1)) < 1e-8);
  }
  const standing = projectAxisLabels([{ ...anchors[0], face: 'ground' }], view, 800, 640)[0];
  assert.equal(standing.rise, 1);
  assert.equal(faceAt(180), 0);
  assert.ok(Math.abs(faceAt(29.999) - faceAt(30.001)) < 1e-6);
});

test('Date and Version title gaps match in screen space and grow gently as zoom decreases', async () => {
  const { axisLabelScreenPosition } = await import('../src/features/iteration-gallery/axis-label-layout.ts');
  const view = camera();
  const titles: AxisAnchor[] = [
    { id: 'date-title', text: 'Date', face: 'wall', valueOrigin: new THREE.Vector3(0, 168, -700), position: new THREE.Vector3(0, 306, -700) },
    { id: 'version-title', text: 'Version', face: 'ground', valueOrigin: new THREE.Vector3(528, -260, -700), position: new THREE.Vector3(666, -260, -700) },
  ];
  const gap = (anchor: AxisAnchor) => {
    const point = axisLabelScreenPosition(anchor, view, 800, 640);
    const origin = axisLabelScreenPosition({ ...anchor, position: anchor.valueOrigin!, valueOrigin: undefined }, view, 800, 640);
    return Math.hypot(point.x - origin.x, point.y - origin.y);
  };
  for (const position of [[1000, 850, 1000], [100, 400, 1000], [-800, 200, -1000]]) {
    view.position.set(...position as [number, number, number]); view.lookAt(0, 0, 0); view.updateMatrixWorld();
    view.zoom = 1; view.updateProjectionMatrix();
    const baseline = gap(titles[0]);
    assert.ok(Math.abs(baseline - gap(titles[1])) < 1e-8);
    view.zoom = .5; view.updateProjectionMatrix();
    assert.ok(gap(titles[0]) > baseline);
    assert.ok(gap(titles[0]) < baseline * 1.25);
    assert.ok(Math.abs(gap(titles[0]) - gap(titles[1])) < 1e-8);
  }
});

test('versions stand at ordinary elevations and flatten overhead while dates fade', async () => {
  const { axisTopBlend, axisLabelRotation } = await import('../src/features/iteration-gallery/axis-label-layout.ts');
  const view = camera();
  for (const yaw of [0, 45, 130]) {
    const a = THREE.MathUtils.degToRad(yaw);
    view.position.set(Math.sin(a) * 1000, 400, Math.cos(a) * 1000); view.lookAt(0, 0, 0); view.updateMatrixWorld();
    assert.equal(axisTopBlend(view), 0);
    assert.ok(Math.abs(axisLabelRotation('ground', 0, axisTopBlend(view)).x) < 1e-8);
  }
  view.position.set(0, 1000, 100); view.lookAt(0, 0, 0); view.updateMatrixWorld();
  assert.equal(axisTopBlend(view), 1);
  const labels = projectAxisLabels([...anchors, { ...anchors[0], id: 'version', face: 'ground' }], view, 800, 640);
  assert.equal(labels[0].opacity, 0);
  assert.equal(labels[1].opacity, 1);
  assert.equal(labels[1].rise, 0);
  const normal = new THREE.Vector3(0, 0, 1).applyEuler(axisLabelRotation('ground', 0, 1));
  assert.ok(normal.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-8);
});

test('overhead caption faces the camera with its bottom-left above the projected block-left edge', async () => {
  const { hoverCaptionPose } = await import('../src/features/iteration-gallery/caption-layout.ts');
  const { galleryTokens: t } = await import('../src/features/iteration-gallery/tokens.ts');
  const view = camera();
  const frame = { x: 10, y: 10, width: 340, depth: 250 };
  const size = { width: 180, height: 50 };
  for (const x of [-100, 100]) {
    view.position.set(x, 1000, 100); view.lookAt(0, 0, 0); view.updateMatrixWorld();
    const pose = hoverCaptionPose(frame, size, view, 1);
    assert.ok(pose.rotation.angleTo(view.quaternion) < 1e-6);
    const bottomLeft = new THREE.Vector3(-size.width / 2, -size.height / 2, 0).applyQuaternion(pose.rotation).add(pose.position).project(view);
    const ends = [new THREE.Vector3(frame.x - t.padding, -frame.y, -frame.depth), new THREE.Vector3(frame.x + frame.width + t.padding, -frame.y, -frame.depth)].map(point => point.project(view)).sort((a, b) => a.x - b.x);
    assert.ok(Math.abs(bottomLeft.x - ends[0].x) < 1e-8);
    assert.ok(bottomLeft.y > ends[0].y);
  }
});

test('overhead date ruler mirrors wall lengths on the left floor and crossfades as a pair', async () => {
  const { withOverheadDates, overheadDatePosition } = await import('../src/features/iteration-gallery/axis-label-layout.ts');
  const wall: AxisAnchor = { id: 'featured:date', text: 'Sep 24, 6:09', face: 'wall', featured: true, position: new THREE.Vector3(0, 96, -400) };
  const ground: AxisAnchor = { id: 'featured:version', text: 'V14', face: 'ground', position: new THREE.Vector3(456, -260, -400) };
  const both = withOverheadDates([wall, ground], -260);
  assert.equal(both.length, 3);
  const date = both.find(anchor => anchor.overheadDate)!;
  assert.deepEqual(date.position.toArray(), [-96, -260, -400]);
  assert.equal(date.text, wall.text);
  assert.equal(date.featured, true);
  assert.deepEqual(wall.position.toArray(), [0, 96, -400]);
  const begin = overheadDatePosition(new THREE.Vector3(0, 0, -400), -260);
  assert.equal(begin.distanceTo(date.position), 96);
  const labels = projectAxisLabels(both, camera(), 800, 640, .3);
  assert.equal(labels.find(label => label.id === wall.id)!.opacity, .7);
  assert.equal(labels.find(label => label.id === date.id)!.opacity, .3);
  assert.equal(labels.find(label => label.id === ground.id)!.opacity, 1);
});


test('top titles move beyond the actual sequence end and align to their numeric rails', async () => {
  const { withOverheadDates } = await import('../src/features/iteration-gallery/axis-label-layout.ts');
  const { galleryTokens: t } = await import('../src/features/iteration-gallery/tokens.ts');
  const originals: AxisAnchor[] = [
    { id: 'date-title', text: 'Date', face: 'wall', position: new THREE.Vector3(0, 306, -700), valueOrigin: new THREE.Vector3(0, 168, -700) },
    { id: 'version-title', text: 'Version', face: 'ground', position: new THREE.Vector3(666, -260, -700), valueOrigin: new THREE.Vector3(528, -260, -700) },
    { id: 'date-value', text: 'Sep 24', face: 'wall', position: new THREE.Vector3(0, 168, -1300) },
    { id: 'version-value', text: 'v16', face: 'ground', position: new THREE.Vector3(528, -260, -1300) },
  ];
  const view = camera();
  view.position.set(0, 3000, .001); view.lookAt(0, 0, 0); view.updateMatrixWorld();
  for (const end of [1398, 2102]) {
    const all = withOverheadDates(originals, -260, end);
    const date = all.find(anchor => anchor.id === 'date-title:overhead')!;
    const version = all.find(anchor => anchor.id === 'version-title')!;
    assert.deepEqual(date.topPosition!.toArray(), [-168, -260, -end - t.topView.titleEndGap]);
    assert.deepEqual(version.topPosition!.toArray(), [528, -260, -end - t.topView.titleEndGap]);
    const labels = projectAxisLabels(all, view, 800, 640);
    for (const [titleId, valueId, align] of [['date-title:overhead', 'date-value:overhead', 0], ['version-title', 'version-value', 1]] as const) {
      const title = labels.find(label => label.id === titleId)!;
      const value = labels.find(label => label.id === valueId)!;
      assert.equal(title.align, align); assert.equal(value.align, align);
      assert.ok(Math.abs(matrix(title.transform)[12] - matrix(value.transform)[12]) < 1e-8);
      assert.ok(matrix(title.transform)[13] < matrix(value.transform)[13]);
    }
  }
  assert.equal(originals[0].position.z, -700);
});


test('label layers use capture recency rather than input order or label text', () => {
  const labels = projectAxisLabels([
    { ...anchors[0], id: 'new', timestamp: 300 },
    { ...anchors[0], id: 'old', timestamp: 100 },
    { ...anchors[0], id: 'same-day-feature', timestamp: 200, featured: true },
    { ...anchors[0], id: 'title', text: 'Date' },
  ], camera(), 800, 640);
  assert.deepEqual(labels.map(label => label.layer), [3, 1, 2, 0]);
});


test('token titles keep a fixed left inset and remain on their numeric rail rows at different zooms', async () => {
  const { withOverheadDates } = await import('../src/features/iteration-gallery/axis-label-layout.ts');
  const { galleryTokens: t } = await import('../src/features/iteration-gallery/tokens.ts');
  const view = camera();
  view.position.set(.001, 3000, 0); view.lookAt(0, 0, 0); view.updateMatrixWorld();
  const all = withOverheadDates([
    { id: 'date-title', text: 'Date', face: 'wall', position: new THREE.Vector3(0, 306, -700), valueOrigin: new THREE.Vector3(0, 168, -700) },
    { id: 'version-title', text: 'Version', face: 'ground', position: new THREE.Vector3(666, -260, -700), valueOrigin: new THREE.Vector3(528, -260, -700) },
    { id: 'date-value', text: 'Sep 24', face: 'wall', position: new THREE.Vector3(0, 168, -1300) },
    { id: 'version-value', text: 'v16', face: 'ground', position: new THREE.Vector3(528, -260, -1300) },
  ], -260, 1400);
  for (const zoom of [.4, 1, 2]) {
    view.zoom = zoom; view.updateProjectionMatrix();
    const labels = projectAxisLabels(all, view, 800, 640, 1, 1);
    for (const [titleId, valueId] of [['date-title:overhead', 'date-value:overhead'], ['version-title', 'version-value']]) {
      const title = labels.find(label => label.id === titleId)!;
      const value = labels.find(label => label.id === valueId)!;
      assert.equal(matrix(title.transform)[12], t.tokenUsage.axisInsetPx);
      assert.equal(title.align, 0);
      assert.ok(Math.abs(matrix(title.transform)[13] - matrix(value.transform)[13]) < .001);
    }
  }
});
