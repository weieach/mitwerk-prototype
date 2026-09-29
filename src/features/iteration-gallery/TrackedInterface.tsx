import { RowSelect } from '../../components/RowSelect';
import { Icon } from '../../components/Icon';
import { galleryTokens as t } from './tokens';

export function TrackedInterface({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <span className="tracked-interface"><RowSelect label="Tracked interface" value={value} onChange={onChange}
    leading={<Icon name="file" size={14}/>} options={t.interfaces}/></span>;
}
