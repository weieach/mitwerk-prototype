import { Icon } from './Icon';
import { isPictureFile } from '../features/version-tree/model';

export function ReferenceFiles({ files, limit = Infinity }: { files: { name: string; url?: string }[]; limit?: number }) {
  if (!files.length) return null;
  return <div className="reference-files" aria-label="Reference files" data-orbit-blocked>
    {files.slice(0, limit).map(file => <span className="file-chip" key={file.url ?? file.name} title={file.name}>
      <Icon name={isPictureFile(file.name) ? 'image' : 'file'} size={12}/>
      {file.url ? <a className="file-chip-name capture-frame-link" href={`${import.meta.env.BASE_URL}${file.url}`} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()}>{file.name}</a> : <span className="file-chip-name">{file.name}</span>}
    </span>)}
    {files.length > limit && <span className="mono">+{files.length - limit}</span>}
  </div>;
}
