import { BucketTag } from './BucketTag';
import { todoTimestamp, type ComposerTodo } from './composer-state';

/** The muted line under a to-do: location · version · age, each part left out when absent.
 *  Shared by the To-do drawer and Idea stream cards so both read the same. */
export function TodoDetails({ todo, clock }: { todo: Pick<ComposerTodo, 'bucket' | 'version' | 'created'>; clock: Date }) {
  return <span className="todo-details">
    {todo.bucket && <BucketTag bucket={todo.bucket}/>}
    {todo.version !== undefined && <span className="todo-details-version">v{todo.version}</span>}
    <time dateTime={todo.created}>{todoTimestamp(todo.created, clock)}</time>
  </span>;
}
