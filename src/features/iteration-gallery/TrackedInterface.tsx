import { Icon } from '../../components/Icon';
import { galleryTokens as t } from './tokens';

export function TrackedInterface({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <span className="tracked-interface"><Icon name="file" size={14}/><select aria-label="Tracked interface" value={value} onChange={event => onChange(event.target.value)}>
    {t.interfaces.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
  </select></span>;
}
