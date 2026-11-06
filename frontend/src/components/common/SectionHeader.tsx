import type { ReactNode } from 'react';

export function SectionHeader({ id, title, subtitle, action, eyebrow }: {
  id?: string; title: string; subtitle?: string; action?: ReactNode; eyebrow?: string;
}) {
  return (
    <div className="section-header">
      <div>
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h2 id={id} className="section-title">{title}</h2>
        {subtitle && <p className="section-subtitle">{subtitle}</p>}
      </div>
      {action && <div className="section-action">{action}</div>}
    </div>
  );
}
