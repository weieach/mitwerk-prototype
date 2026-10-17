import { PhosphorIcon } from '../../components/PhosphorIcon';

/** A to-do's capture bucket, drawn like the Capturing chip. */
export function BucketTag({ bucket }: { bucket: string }) {
  return <span className="bucket-tag" title={`Capture bucket: ${bucket}`}><PhosphorIcon name="folder" size={10}/><span>{bucket}</span></span>;
}
