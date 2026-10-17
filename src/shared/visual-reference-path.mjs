/** Only the root or the designated annotation directory may contain catalog references. */
export function visualReferencePrompt(path) {
  const name = path.startsWith('annotation/') ? path.slice('annotation/'.length) : path;
  if (path.startsWith('annotation/') && !/^\[prompt #\d+\] \[annotation\] /.test(name)) return null;
  const match = /^\[prompt #(\d+)\]\s+[^/\\]+\.png$/i.exec(name);
  return match && Number.isSafeInteger(+match[1]) && +match[1] > 0 ? +match[1] : null;
}
export function visualReferencePath(filename, prompt, annotation = false) {
  if (!Number.isSafeInteger(prompt) || prompt < 1 || /[/\\]/.test(filename) || !/\.png$/i.test(filename)) throw new Error('A PNG filename and positive prompt number are required.');
  const original = filename.replace(/^\[prompt #\d+\]\s*/, '').replace(/^\[annotation\]\s*/, '');
  return `${annotation ? 'annotation/' : ''}[prompt #${prompt}] ${annotation ? '[annotation] ' : ''}${original}`;
}
