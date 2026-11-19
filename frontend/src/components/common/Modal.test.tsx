import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { render, text } from '../../test/render.tsx';
import { ConfirmDialog } from './ConfirmDialog.tsx';
import { focusInitialElement } from './Modal.tsx';

describe('dialog initial focus (Sonar S9379: no autofocus attribute)', () => {
  it('focuses the element marked for initial focus', () => {
    let focused = 0;
    const marked = { focus: () => { focused++; } };
    const asked: string[] = [];
    focusInitialElement({ querySelector: ((selector: string) => { asked.push(selector); return marked; }) as ParentNode['querySelector'] });
    assert.deepEqual(asked, ['[data-initial-focus]']);
    assert.equal(focused, 1);
  });

  it('leaves the browser default when nothing is marked', () => {
    assert.doesNotThrow(() => focusInitialElement({ querySelector: (() => null) as ParentNode['querySelector'] }));
  });

  it('marks the safe Cancel button, never the destructive one, and renders no autofocus attribute', () => {
    const html = render(<ConfirmDialog open title="Clear your cart?" text="All dishes will be removed." confirmLabel="Clear cart"
      cancelLabel="Cancel" onConfirm={() => {}} onCancel={() => {}} />);
    assert.match(text(html), /Clear your cart\?/);
    assert.equal((html.match(/data-initial-focus/g) ?? []).length, 1);
    assert.match(html, /<button[^>]*data-initial-focus="true"[^>]*>Cancel<\/button>/);
    assert.doesNotMatch(html, /<button[^>]*data-initial-focus[^>]*>Clear cart<\/button>/);
    assert.doesNotMatch(html, /autofocus/i);
  });
});
