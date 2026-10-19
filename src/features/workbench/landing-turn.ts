import { easeInOutCubic, frameBand, lerp, progress, type Band, type LandingIntro } from './landing-intro.ts';

export const TURN_INTRO = {
  frames: 7, depthStep: 1.55, cover: 1.2,
  turnStart: .25, turnDuration: 1.5,
  spreadStart: 2.05, spreadDuration: 1.1, spreadStagger: .07,
  fillReturnOffset: .45, fillReturnDuration: .45,
  gatherStart: 4.1, gatherDuration: 1.25,
  revealAt: 5.35, settleTime: 5.95,
  fit: { width: .76, height: .66 },
  light: { x:.6, y:-.45, z:-1.2 },
  backlitFace:.8,
} as const;

/** A face-on sheet turns into a lit row of quads, then gathers onto the SVG logo. */
export const turnIntro: LandingIntro = {
  revealAt: TURN_INTRO.revealAt,
  settleTime: TURN_INTRO.settleTime,
  orbitAfterSettle: true,
  light: TURN_INTRO.light,
  fillOpacity: time => 1 - easeInOutCubic(progress(time, TURN_INTRO.spreadStart, TURN_INTRO.spreadDuration + (TURN_INTRO.frames - 1) / 2 * TURN_INTRO.spreadStagger))
    + easeInOutCubic(progress(time, TURN_INTRO.gatherStart + TURN_INTRO.fillReturnOffset, TURN_INTRO.fillReturnDuration)),
  illumination: time => easeInOutCubic(progress(time, TURN_INTRO.turnStart, TURN_INTRO.turnDuration)) * lerp(TURN_INTRO.backlitFace, 1, easeInOutCubic(progress(time, TURN_INTRO.gatherStart, TURN_INTRO.gatherDuration))),
  bands(time, viewport, target, geometry) {
    const t = TURN_INTRO;
    const turn = easeInOutCubic(progress(time, t.turnStart, t.turnDuration));
    const gather = easeInOutCubic(progress(time, t.gatherStart, t.gatherDuration));
    const span = (t.frames - 1) * t.depthStep;
    const spreadScale = Math.min(viewport.width * t.fit.width / (geometry.frame.width + geometry.offset.x * span), viewport.height * t.fit.height / (geometry.height - geometry.offset.y + geometry.offset.y * span));
    const scale = spreadScale * (target.height / geometry.height / spreadScale) ** gather;
    const center = { x:lerp(viewport.width / 2, target.x + target.width / 2, gather), y:lerp(viewport.height / 2, target.y + target.height / 2, gather) };
    const origin = { x:center.x - geometry.width * scale / 2, y:center.y - geometry.height * scale / 2 };
    const x0 = viewport.width * (1 - t.cover) / 2, x1 = viewport.width - x0;
    const y0 = viewport.height * (1 - t.cover) / 2, y1 = viewport.height - y0;
    // Keep every sheet exactly coincident through the completed turn and flattened hold.
    return Array.from({ length:t.frames }, (_, index): Band => {
      const spread = easeInOutCubic(progress(time, t.spreadStart + Math.abs(index - (t.frames - 1) / 2) * t.spreadStagger, t.spreadDuration));
      const depth = lerp(.5 + (index - (t.frames - 1) / 2) * t.depthStep * spread, index < t.frames / 2 ? 0 : 1, gather);
      const quad = frameBand(geometry, origin, depth, scale);
      return {
        x0:lerp(x0, quad.x0, turn), x1:lerp(x1, quad.x1, turn),
        topHinge:lerp(viewport.width / 2, quad.topHinge, turn), bottomHinge:lerp(viewport.width / 2, quad.bottomHinge, turn),
        top:quad.top.map(y => lerp(y0, y, turn)) as Band['top'],
        bottom:quad.bottom.map(y => lerp(y1, y, turn)) as Band['bottom'],
      };
    });
  },
};
