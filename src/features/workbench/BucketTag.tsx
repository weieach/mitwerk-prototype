import { PhosphorIcon } from '../../components/PhosphorIcon';

/** A to-do's capture bucket, drawn like the Capturing chip. */
export function BucketTag({ bucket, onRemove }: { bucket: string; onRemove?: () => void }) {
  return <span className="bucket-tag" title={`Capture location: ${bucket}`}><PhosphorIcon name="folder" size={10}/><span>{bucket}</span>{onRemove && <button type="button" className="location-chip-remove" aria-label={`Remove location ${bucket}`} onClick={onRemove}><PhosphorIcon name="x" size={10}/></button>}</span>;
}
