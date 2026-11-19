import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { t } from '../../utils/i18n.ts';

interface Props {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  className?: string;
  /** "drawer" slides in from the side (mobile navigation). */
  variant?: 'dialog' | 'drawer';
}

/** Marks the element that receives focus when a dialog opens (for example the least destructive button). */
export const INITIAL_FOCUS = { 'data-initial-focus': true } as const;

/**
 * Moves focus to the element marked with {@link INITIAL_FOCUS}, if there is one. Called right after showModal(): React's
 * autoFocus runs earlier, while the dialog is still closed, so it cannot do this. Without a marked element the browser's
 * default applies (the first focusable element: the close button).
 */
export function focusInitialElement(root: Pick<ParentNode, 'querySelector'>): void {
  root.querySelector<HTMLElement>('[data-initial-focus]')?.focus();
}

/** Native <dialog>: focus is trapped, Esc closes it, and the page behind is inert. Clicking the backdrop closes it. */
export function Modal({ open, onClose, labelledBy, children, className = '', variant = 'dialog' }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) {
      return;
    }
    if (open && !dialog.open) {
      dialog.showModal();
      focusInitialElement(dialog);
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog ref={ref} className={`modal modal-${variant} ${className}`} aria-labelledby={labelledBy}
      onClose={onClose} onCancel={(e) => { e.preventDefault(); onClose(); }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel">
        <button type="button" className="icon-button modal-close" onClick={onClose} aria-label={t('dish.close')}>
          <X size={20} aria-hidden="true" />
        </button>
        {open && children}
      </div>
    </dialog>
  );
}
