import { useEffect, useState } from 'react';
import { PhosphorIcon } from '../../components/PhosphorIcon';
import { useLeavingValue } from '../../shared/useLeavingValue';

/** Prototype feedback only: this option never creates a Git commit. */
export function MilestoneCommitOption() {
  const [branch, setBranch] = useState('');
  const [checked, setChecked] = useState(false);
  const [success, setSuccess] = useState(false);
  const successToast = useLeavingValue(success);
  useEffect(() => {
    const abort = new AbortController();
    fetch(`${import.meta.env.BASE_URL}gallery/git-history.json`, { signal: abort.signal, cache: 'no-cache' })
      .then(response => { if (!response.ok) throw new Error('History unavailable'); return response.json(); })
      .then(history => { if (typeof history.currentBranch === 'string') setBranch(history.currentBranch); })
      .catch(() => { /* Keep the optional action disabled until the branch is known. */ });
    return () => abort.abort();
  }, []);
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(false), 3000);
    return () => clearTimeout(timer);
  }, [success]);
  return <><label className="milestone-commit-option"><input type="checkbox" disabled={!branch} checked={checked} onChange={event => { setChecked(event.target.checked); setSuccess(event.target.checked); }}/><span>Also commit to <span className="milestone-branch"><PhosphorIcon name="git-branch"/>{branch || 'current branch'}</span></span></label>
    {successToast.shown && <div className="mw-toast" role="status" data-leaving={successToast.leaving || undefined}>Success<button type="button" aria-label="Dismiss notification" onClick={() => setSuccess(false)}><PhosphorIcon name="x"/></button></div>}
  </>;
}
