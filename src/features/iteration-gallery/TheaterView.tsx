import { useEffect, useRef, useState } from 'react';
import type { GalleryFrame, LoopMode } from './model';
import { formatTime, playbackStep } from './model';
import { galleryTokens as t } from './tokens';

export function TheaterView({ frames, selectedId, onSelect }: { frames: GalleryFrame[]; selectedId: string; onSelect: (id: string) => void }) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [mode, setMode] = useState<LoopMode>('loop');
  const [direction, setDirection] = useState(1);
  const [preset, setPreset] = useState('original');
  const [custom, setCustom] = useState({ width: 1280, height: 800 });
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 600, height: 220 });
  const index = Math.max(0, frames.findIndex(frame => frame.id === selectedId));
  const frame = frames[index];
  const sequence = frames.map(frame => frame.id).join('|');

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    if (stageRef.current) observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [Boolean(frame)]);

  useEffect(() => { setPlaying(false); setDirection(1); }, [sequence]);
  useEffect(() => {
    if (!playing || !frame) return;
    const timer = window.setTimeout(() => {
      const next = playbackStep(index, frames.length, direction, mode);
      onSelect(frames[next.index].id); setDirection(next.direction); setPlaying(next.playing);
    }, t.playbackIntervalMs / speed);
    return () => window.clearTimeout(timer);
  }, [playing, frame, index, frames, direction, mode, speed, onSelect]);

  if (!frame) return <div className="gallery-empty">No frames in this date range. Choose a wider range to play.</div>;
  const viewport = t.viewportPresets.find(option => option.value === preset)!;
  const dimensions = preset === 'original' ? frame : preset === 'custom' ? custom : viewport;
  function step(delta: number) {
    setPlaying(false); setDirection(1);
    onSelect(frames[Math.max(0, Math.min(frames.length - 1, index + delta))].id);
  }

  return <div className="theater-view">
    <div className="gallery-toolbar">
      <label>Viewport <select value={preset} onChange={event => setPreset(event.target.value)} aria-label="Preview viewport">
        {t.viewportPresets.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select></label>
      {preset === 'custom' && <div className="gallery-custom-size">
        <input aria-label="Custom viewport width" type="number" min="120" max="4096" value={custom.width} onChange={event => setCustom({ ...custom, width: Math.max(120, Math.min(4096, +event.target.value || 120)) })}/>
        <span>×</span><input aria-label="Custom viewport height" type="number" min="120" max="4096" value={custom.height} onChange={event => setCustom({ ...custom, height: Math.max(120, Math.min(4096, +event.target.value || 120)) })}/>
      </div>}
      <span className="gallery-small">{dimensions.width} × {dimensions.height}</span>
    </div>
    <div className="theater-stage" ref={stageRef}>
      <div className="theater-screen" style={{ aspectRatio: `${dimensions.width} / ${dimensions.height}`, width: Math.min(stageSize.width, stageSize.height * dimensions.width / dimensions.height) }}>
        {failedImage === frame.id ? <div className="gallery-empty">This saved image could not be loaded.</div>
          : <img key={frame.id} src={`${import.meta.env.BASE_URL}${frame.url}`} alt={`V${frame.version}: ${frame.summary}`} onError={() => { setFailedImage(frame.id); setPlaying(false); }}/>} 
      </div>
    </div>
    <div className="theater-metadata">
      <div className="theater-version"><strong>V{frame.version} · {frame.kind} {frame.number ?? ''}{frame.branch ? ` · ${frame.branch}` : ''}</strong><time dateTime={new Date(frame.timestamp).toISOString()}>{formatTime(frame.timestamp)}</time></div>
      <p>{frame.summary}</p>
      <div className="gallery-toolbar">
        <a className="gallery-file" href={`${import.meta.env.BASE_URL}${frame.url}`} target="_blank" rel="noreferrer" title={frame.filename}>Open saved frame ↗</a>
        {frame.added && <span className="gallery-small">+{frame.added} −{frame.removed} lines</span>}
        <button disabled title="Capture filenames do not contain a commit ID.">Go to commit</button>
        <button disabled title="Chat is not connected in this prototype.">Add frame to chat</button>
      </div>
    </div>
    <div className="theater-playback">
      <div className="gallery-toolbar playback-controls">
        <button className="icon-button" onClick={() => step(-1)} disabled={index === 0} aria-label="Previous frame">◀◀</button>
        <button className="gallery-play" onClick={() => { if (!playing && mode === 'once' && index === frames.length - 1) onSelect(frames[0].id); setPlaying(!playing); }} disabled={frames.length < 2} aria-label={playing ? 'Pause playback' : 'Play frames'}>{playing ? 'Pause' : 'Play'}</button>
        <button className="icon-button" onClick={() => step(1)} disabled={index === frames.length - 1} aria-label="Next frame">▶▶</button>
        <label><span className="sr-only">Playback speed</span><select aria-label="Playback speed" value={speed} onChange={event => setSpeed(+event.target.value)}>{t.speeds.map(value => <option key={value} value={value}>{value}×</option>)}</select></label>
        <select aria-label="Playback loop" value={mode} onChange={event => { setMode(event.target.value as LoopMode); setDirection(1); }}><option value="once">Play once</option><option value="loop">Loop</option><option value="ping-pong">Ping-pong</option></select>
      </div>
      <div className="gallery-timeline">
        <div className="gallery-timeline-ticks" aria-hidden="true">{frames.map((item, i) => <i key={item.id} className={i === index ? 'is-current' : ''} title={`V${item.version}`} />)}</div>
        <input aria-label="Playback position" aria-valuetext={`Frame ${index + 1} of ${frames.length}, V${frame.version}`} type="range" min="0" max={Math.max(0, frames.length - 1)} value={index} onChange={event => { setPlaying(false); onSelect(frames[+event.target.value].id); }}/>
      </div>
      <div className="theater-version gallery-small"><span>Frame {index + 1} of {frames.length}</span><span>Saved images · viewport changes do not reflow their contents</span></div>
    </div>
  </div>;
}
