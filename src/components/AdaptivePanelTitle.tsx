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
      let used = groups.reduce((sum, group) => sum + group.getBoundingClientRect().width, 0);
      for (const fill of header.querySelectorAll<HTMLElement>('[data-header-fill]')) {
        const content = fill.matches('[data-header-fill-content]') ? fill : fill.querySelector<HTMLElement>('[data-header-fill-content]')!;
        const label = content.querySelector<HTMLElement>('.header-fill-label')!;
        const contentStyle = getComputedStyle(content);
        const copy = label.querySelector<HTMLElement>('.row-select-copy');
        const naturalLabelWidth = copy ? copy.scrollWidth + Array.from(label.children).filter(child => child !== copy).reduce((sum, child) => sum + child.getBoundingClientRect().width, 0) + (parseFloat(getComputedStyle(label).columnGap) || 0) * (label.children.length - 1) : label.scrollWidth;
        const intrinsic = naturalLabelWidth + 12 + (parseFloat(contentStyle.columnGap) || 0)
          + parseFloat(contentStyle.paddingLeft) + parseFloat(contentStyle.paddingRight);
        used += intrinsic - fill.getBoundingClientRect().width;
      }
      const needed = used + measure.getBoundingClientRect().width - visible.getBoundingClientRect().width
        + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
        + (parseFloat(style.columnGap) || 0) * Math.max(0, groups.length - 1);
      setCompact(needed > header.clientWidth + 1);
    }
    const observer = new ResizeObserver(update);
    observer.observe(header);
    for (const child of header.children) observer.observe(child);
    observer.observe(measure);
    const mutations = new MutationObserver(update);
    mutations.observe(header, { childList: true, characterData: true, subtree: true });
    update();
    return () => { observer.disconnect(); mutations.disconnect(); };
  }, [full]);

  return <h2 ref={title} id={id} className="adaptive-panel-title" aria-label={full} title={full}>
    <span className="panel-title-measure" aria-hidden="true">{full}</span>
    <span className={`panel-title-visible${compact ? ' is-compact' : ''}`} aria-hidden="true">{compact ? short : full}</span>
  </h2>;
}
