import { Icon } from './Icon';
import { isPictureFile } from '../features/version-tree/model';

type ReferenceFile = { name: string; url?: string; thumbUrl?: string };
export function ReferenceFiles({ files, limit = Infinity, thumbnails = false, onAttach }: { files: ReferenceFile[]; limit?: number; thumbnails?: boolean; onAttach?: (file: ReferenceFile) => void }) {
  if (!files.length) return null;
  return <div className={`reference-files${thumbnails ? ' reference-thumbnails' : ''}`} aria-label="Reference files" data-orbit-blocked>
    {files.slice(0, limit).map(file => thumbnails && file.url && isPictureFile(file.name) ? <button type="button" key={file.url} className="reference-thumbnail" aria-label={`Add image to chat: ${file.name}`} title={file.name} onClick={event => {event.stopPropagation(); onAttach?.(file);}}><img src={`${import.meta.env.BASE_URL}${file.thumbUrl ?? file.url}`} alt={file.name}/></button> : <span className="file-chip" key={file.url ?? file.name} title={file.name}>
      <Icon name={isPictureFile(file.name) ? 'image' : 'file'} size={12}/>
      {file.url ? <a className="file-chip-name capture-frame-link" href={`${import.meta.env.BASE_URL}${file.url}`} target="_blank" rel="noreferrer" onClick={event => event.stopPropagation()}>{file.name}</a> : <span className="file-chip-name">{file.name}</span>}
    </span>)}
    {files.length > limit && <span className="mono">+{files.length - limit}</span>}
  </div>;
}
