import { useLayoutEffect, useRef, useState } from 'react';

/** Shorten only when the full title and its sibling controls cannot fit. */
export function AdaptivePanelTitle({ full, short, id }: { full: string; short: string; id?: string }) {
  const title = useRef<HTMLHeadingElement>(null);
  const [compact, setCompact] = useState(false);
  useLayoutEffect(() => {
    const element = title.current!;
    const header = element.closest<HTMLElement>('.panel-header')!;
    const measure = element.querySelector<HTMLElement>('.panel-title-measure')!;
    const visible = element.querySelector<HTMLElement>('.panel-title-visible')!;
    function update() {
      const style = getComputedStyle(header);
      const groups = Array.from(header.children) as HTMLElement[];
      const used = groups.reduce((sum, group) => sum + group.getBoundingClientRect().width, 0);
      const needed = used + measure.getBoundingClientRect().width - visible.getBoundingClientRect().width
        + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
        + (parseFloat(style.columnGap) || 0) * Math.max(0, groups.length - 1);
      setCompact(needed > header.clientWidth + 1);
    }
    const observer = new ResizeObserver(update);
    observer.observe(header);
    for (const child of header.children) observer.observe(child);
    observer.observe(measure);
    update();
    return () => observer.disconnect();
  }, [full]);

  return <h2 ref={title} id={id} className="adaptive-panel-title" aria-label={full} title={full}>
    <span className="panel-title-measure" aria-hidden="true">{full}</span>
    <span className={`panel-title-visible${compact ? ' is-compact' : ''}`} aria-hidden="true">{compact ? short : full}</span>
  </h2>;
}
