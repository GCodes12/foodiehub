import { useId } from 'react';
import { INITIAL_FOCUS, Modal } from './Modal.tsx';

/** Asks before a destructive action (for example clearing the cart). */
export function ConfirmDialog({ open, title, text, confirmLabel, cancelLabel, onConfirm, onCancel }: {
  open: boolean; title: string; text: string; confirmLabel: string; cancelLabel: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  const titleId = useId();
  return (
    <Modal open={open} onClose={onCancel} labelledBy={titleId} className="confirm">
      <h2 id={titleId} className="confirm-title">{title}</h2>
      <p className="confirm-text">{text}</p>
      <div className="confirm-actions">
        {/* Focus starts on the safe choice, never on the destructive one. */}
        <button type="button" className="btn btn-secondary" onClick={onCancel} {...INITIAL_FOCUS}>{cancelLabel}</button>
        <button type="button" className="btn btn-danger" onClick={onConfirm}>{confirmLabel}</button>
      </div>
    </Modal>
  );
}
