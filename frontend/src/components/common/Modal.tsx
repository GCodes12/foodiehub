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
