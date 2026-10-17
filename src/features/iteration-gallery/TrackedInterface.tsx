import { RowSelect } from '../../components/RowSelect';
import { PhosphorIcon } from '../../components/PhosphorIcon';
import { useCaptureBuckets } from '../../shared/useCaptureBuckets';

export function TrackedInterface({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const buckets = useCaptureBuckets();
  return <span className="tracked-interface"><RowSelect label="Tracked interface" value={value} onChange={onChange}
    leading={<PhosphorIcon name="folder" size={18}/>} options={buckets}/></span>;
}
