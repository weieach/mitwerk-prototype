import { PanelIcon } from './PanelIcon';
import { useLayoutEffect, useRef, useState } from 'react';

/** Shorten only when the full title and its sibling controls cannot fit. */
export function AdaptivePanelTitle({ full, short, id, icon }: { full: string; short: string; id?: string; icon?: string }) {
  const title = useRef<HTMLHeadingElement>(null);
  const [compact, setCompact] = useState(false);
  useLayoutEffect(() => {
    const element = title.current!;
    const header = element.closest<HTMLElement>('.panel-header')!;
    const measure = element.querySelector<HTMLElement>('.panel-title-measure')!;
    const shortMeasure = element.querySelector<HTMLElement>('.panel-title-short-measure')!;
    const visible = element.querySelector<HTMLElement>('.panel-title-visible')!;
    function update() {
      const style = getComputedStyle(header);
      const groups = Array.from(header.children) as HTMLElement[];
      const savedFlex = groups.map(group => group.style.flex);
      for (const group of groups) group.style.flex = '0 0 auto';
      let used = groups.reduce((sum, group) => sum + group.getBoundingClientRect().width, 0);
      for (const fill of header.querySelectorAll<HTMLElement>('[data-header-fill]')) {
        const content = fill.matches('[data-header-fill-content]') ? fill : fill.querySelector<HTMLElement>('[data-header-fill-content]')!;
        const label = content.querySelector<HTMLElement>('.header-fill-label') ?? content;
        const contentStyle = getComputedStyle(content);
        const copy = label.querySelector<HTMLElement>('.row-select-copy');
        const naturalLabelWidth = copy ? copy.scrollWidth + Array.from(label.children).filter(child => child !== copy).reduce((sum, child) => sum + child.getBoundingClientRect().width, 0) + (parseFloat(getComputedStyle(label).columnGap) || 0) * (label.children.length - 1) : label.scrollWidth;
        const intrinsic = naturalLabelWidth + 12 + (parseFloat(contentStyle.columnGap) || 0)
          + parseFloat(contentStyle.paddingLeft) + parseFloat(contentStyle.paddingRight);
        used += intrinsic - fill.getBoundingClientRect().width;
      }
      groups.forEach((group, index) => { group.style.flex = savedFlex[index]; });
      const fullWidth = measure.getBoundingClientRect().width;
      const titleStyle = getComputedStyle(element);
      const needed = used + fullWidth - visible.getBoundingClientRect().width
        + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
        + (parseFloat(style.columnGap) || 0) * Math.max(0, groups.length - 1);
      // Report the minimum usable header width, independent of the optional compact switch.
      const switchWidth = header.querySelector('.version-panel-switch')?.getBoundingClientRect().width ?? 0;
      const minimum = Math.ceil(needed - fullWidth + shortMeasure.getBoundingClientRect().width - switchWidth);
      if (header.getBoundingClientRect().width > 0) header.dataset.minHeaderWidth = String(minimum);
      const fits = needed <= header.clientWidth + 1;
      const iconWidth = element.querySelector<HTMLElement>(':scope > .ui-icon')?.getBoundingClientRect().width ?? 0;
      const iconSpace = iconWidth ? iconWidth + (parseFloat(titleStyle.columnGap) || 0) : 0;
      element.style.minWidth = fits ? `${fullWidth + iconSpace + parseFloat(titleStyle.paddingLeft) + parseFloat(titleStyle.paddingRight)}px` : '';
      setCompact(!fits);
    }
    const observer = new ResizeObserver(update);
    observer.observe(header);
    for (const child of header.children) observer.observe(child);
    observer.observe(measure);
    observer.observe(shortMeasure);
    const mutations = new MutationObserver(update);
    mutations.observe(header, { childList: true, characterData: true, subtree: true });
    update();
    return () => { observer.disconnect(); mutations.disconnect(); };
  }, [full, short]);

  return <h2 ref={title} id={id} className="adaptive-panel-title" aria-label={full} title={full}>
    <span className="panel-title-measure" aria-hidden="true">{full}</span>
    <span className="panel-title-short-measure" aria-hidden="true">{short}</span>
    {icon && <PanelIcon name={icon} size={15}/>}
    <span className={`panel-title-visible${compact ? ' is-compact' : ''}`} aria-hidden="true">{compact ? short : full}</span>
  </h2>;
}
