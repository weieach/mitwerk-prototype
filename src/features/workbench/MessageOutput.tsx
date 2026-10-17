import { ArrowUpRight } from '../../components/PhosphorIcon';
import mitwerkSymbol from '../../assets/mitwerk-symbol.svg';
import type { Message } from './model';

/** The same output treatment is available to any conversation message. */
export function MessageOutput({ output, onOpen }: { output: NonNullable<Message['versionOutput']>; onOpen: () => void }) {
  return <div className="message-version-output">
    <button type="button" className="message-version-card" onClick={onOpen}><img src={mitwerkSymbol} alt=""/><span>Version block #{output.version}, Prompt #{output.prompt}</span><ArrowUpRight size={14}/></button>
    <button type="button" className="message-version-preview" aria-label={`Open preview for version block ${output.version}, prompt ${output.prompt}`} onClick={onOpen}><img src={`${import.meta.env.BASE_URL}${output.imageUrl}`} alt="Preview of the generated interface"/></button>
  </div>;
}
