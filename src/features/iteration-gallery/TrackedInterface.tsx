import { RowSelect } from '../../components/RowSelect';
import { PhosphorIcon } from '../../components/PhosphorIcon';
import { galleryTokens as t } from './tokens';

export function TrackedInterface({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <span className="tracked-interface"><RowSelect label="Tracked interface" value={value} onChange={onChange}
    leading={<PhosphorIcon name="folder" size={18}/>} options={t.interfaces}/></span>;
}
