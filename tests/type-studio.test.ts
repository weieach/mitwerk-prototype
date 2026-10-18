import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeTypeOverrides, shouldApplyTypeEdits, typeOverrideCss, typeRoleStylesheet, typeRoles } from '../src/shared/type-studio.ts';

function splitTop(selector: string) {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  for (const char of selector) {
    if (char === '(') depth += 1;
    if (char === ')') depth -= 1;
    if (char === ',' && depth === 0) { parts.push(current.trim()); current = ''; }
    else current += char;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

test('every text role is a shared variable and a real selector', () => {
  const css = typeRoleStylesheet();
  const ids = new Set<string>();
  for (const role of typeRoles) {
    assert.equal(ids.has(role.id), false);
    ids.add(role.id);
    assert.match(css, new RegExp(`--type-${role.id}-weight`));
    const parts = splitTop(role.selector);
    for (const part of parts) {
      const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      assert.match(css, new RegExp(`html\\[data-type-roles\\] ${escaped}`));
      assert.match(css, new RegExp(`html\\[data-type-focus="${role.id}"\\] ${escaped}`));
    }
    assert.doesNotMatch(css, /html\[data-type-roles\] :is\(\.workspace, html\[data-type-roles\]/);
  }
  assert.doesNotMatch(css, /html\[data-type-focus="panel-title"\] \.mw-app[^{]*, \.workspace/);
});

test('type edits export only the values that changed', () => {
  assert.equal(typeOverrideCss({}), '');
  const css = typeOverrideCss({ message: { size: 16, weight: 500, tracking: 0.02, italic: true } });
  assert.match(css, /--type-message-size: 16px;/);
  assert.match(css, /--type-message-weight: 500;/);
  assert.match(css, /--type-message-tracking: 0\.02em;/);
  assert.match(css, /--type-message-style: italic;/);
  assert.doesNotMatch(css, /--type-message-leading/);
});

test('stored type edits ignore unknown roles and out-of-range numbers', () => {
  assert.deepEqual(sanitizeTypeOverrides({ message: { size: 4, weight: 900, color: 'var(--ink)' }, missing: { size: 20 } }), { message: { color: 'var(--ink)' } });
  assert.equal(shouldApplyTypeEdits('?screenshot=1&theme=dark'), false);
  assert.equal(shouldApplyTypeEdits(''), true);
});
