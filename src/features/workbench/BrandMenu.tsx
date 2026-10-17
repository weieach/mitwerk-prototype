import { controlTokens } from '../../control-tokens';
import { useId } from 'react';
import { SelectMenu, useSelectMenu } from '../../components/SelectMenu';
import type { Theme } from '../../shared/theme';
import mitwerkSymbol from '../../assets/mitwerk-symbol.svg';

export function BrandMenu({ theme, onTheme }: { theme: Theme; onTheme: (theme: Theme) => void }) {
  const id = useId();
  const menu = useSelectMenu<HTMLButtonElement>(value => {
    if (value === 'theme') onTheme(theme === 'dark' ? 'light' : 'dark');
    if (value === 'exit') location.assign(`${import.meta.env.BASE_URL}?page=landing`);
  });
  return <div className="workspace-brand-menu">
    <button id="navigation-toggle" type="button" className="workspace-brand" {...menu.triggerProps} aria-label="MitWerk menu" aria-controls={menu.open ? id : undefined}>
      <img className="workspace-symbol" src={mitwerkSymbol} alt=""/><strong>MitWerk</strong>
    </button>
    {menu.open && <SelectMenu closing={menu.closing} id={id} label="MitWerk" anchor={menu.trigger} value="" minWidth={230} gap={controlTokens.brandMenuGap} className="brand-dropdown" options={[
      { value:'theme', label:theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode' },
      { value:'exit', label:'Exit to landing screen' },
    ]} onChoose={menu.choose} onDismiss={menu.dismiss}/>}
  </div>;
}
