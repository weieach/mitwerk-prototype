import { controlTokens } from '../../control-tokens';
import { useId } from 'react';
import { SelectMenu, useSelectMenu } from '../../components/SelectMenu';
import type { Theme } from '../../shared/theme';
import { Logomark } from '../../components/Logomark';
import { useWorkState } from '../../shared/useWorkState';
import { workStateStore } from '../../shared/work-state';
import { PhosphorIcon } from '../../components/PhosphorIcon';

export function BrandMenu({ theme, onTheme }: { theme: Theme; onTheme: (theme: Theme) => void }) {
  const id = useId();
  const work = useWorkState();
  const showWorkState = work.open && work.hidden && work.progress < 1;
  const menu = useSelectMenu<HTMLButtonElement>(value => {
    if (value === 'theme') onTheme(theme === 'dark' ? 'light' : 'dark');
    if (value === 'work-state') workStateStore.toggle();
    if (value === 'exit') location.assign(`${import.meta.env.BASE_URL}?page=landing`);
  });
  return <div className="workspace-brand-menu">
    <button id="navigation-toggle" type="button" className="workspace-brand" {...menu.triggerProps} aria-label="verso menu" aria-controls={menu.open ? id : undefined}>
      <Logomark className="workspace-logomark" label={null}/>
    </button>
    {showWorkState && <span className="workspace-work-state">work state {Math.round(work.progress * 100)}%</span>}
    {menu.open && <SelectMenu id={id} label="verso" anchor={menu.trigger} value="" minWidth={190} gap={controlTokens.brandMenuGap} className="brand-dropdown" options={[
      { value:'theme', label:theme === 'dark' ? 'Light mode' : 'Dark mode', leading:<PhosphorIcon name={theme === 'dark' ? 'sun' : 'moon'} size={14}/> },
      { value:'work-state', label:'Work state simulator', leading:<PhosphorIcon name="clock-counter-clockwise" size={14}/> },
      { value:'exit', label:'Exit to splash screen', leading:<PhosphorIcon name="sign-out" size={14}/> },
    ]} onChoose={menu.choose} onDismiss={menu.dismiss}/>}
  </div>;
}
