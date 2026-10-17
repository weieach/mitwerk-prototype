import { ArrowUpRight } from '../../components/PhosphorIcon';
import mitwerkSymbol from '../../assets/mitwerk-symbol.svg';
import type { Message } from './model';

/** The same output treatment is available to any conversation message. */
export function MessageOutput({ output, onOpen }: { output: NonNullable<Message['versionOutput']>; onOpen: () => void }) {
  return <div className="message-version-output">
    <button type="button" className="message-version-card" aria-label={`Version block #${output.version}, Prompt #${output.prompt}`} onClick={onOpen}>
      <span className="message-version-preview"><img src={`${import.meta.env.BASE_URL}${output.imageUrl}`} alt="Preview of the generated interface"/></span>
      <span className="message-version-label"><img src={mitwerkSymbol} alt=""/><span>Version block #{output.version}, Prompt #{output.prompt}</span></span>
      <ArrowUpRight size={14}/>
    </button>
  </div>;
}
