import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/** Friendly empty / not-found / sign-in state with an illustration ring, a title, text and actions. */
export function EmptyState({ icon: Icon, title, text, children }: {
  icon: LucideIcon; title: string; text?: string; children?: ReactNode;
}) {
  return (
    <section className="empty-state">
      <div className="empty-state-art" aria-hidden="true">
        <Icon size={40} strokeWidth={1.5} />
      </div>
      <h1 className="empty-state-title">{title}</h1>
      {text && <p className="empty-state-text">{text}</p>}
      {children && <div className="empty-state-actions">{children}</div>}
    </section>
  );
}
