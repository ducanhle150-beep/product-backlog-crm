import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { IconCalendar, IconUser, IconX } from '@tabler/icons-react';
import { format, isBefore, parseISO, startOfDay } from 'date-fns';
import type { Label, Member } from '../../data/types';
import { MEMBERS } from '../../data/seed';
import './primitives.css';

export const memberById = (id?: string) => MEMBERS.find((m) => m.id === id);

export function Avatar({ member, size = 20, dim }: { member?: Member; size?: number; dim?: boolean }) {
  if (!member) {
    return (
      <span className="avatar avatar--empty" style={{ width: size, height: size }} title="Chưa assign">
        <IconUser size={size * 0.6} stroke={1.5} />
      </span>
    );
  }
  return (
    <span
      className="avatar"
      title={member.name}
      style={{ width: size, height: size, background: member.color, fontSize: size * 0.5, opacity: dim ? 0.75 : 1 }}
    >
      {member.initial}
    </span>
  );
}

export function AvatarStack({ ids, max = 6, size = 22 }: { ids: string[]; max?: number; size?: number }) {
  const shown = ids.slice(0, max);
  return (
    <span className="avatar-stack">
      {shown.map((id) => <Avatar key={id} member={memberById(id)} size={size} />)}
      {ids.length > max && <span className="avatar-more" style={{ height: size }}>+{ids.length - max}</span>}
    </span>
  );
}

export function LabelChip({ label }: { label: Label }) {
  return (
    <span className="chip">
      <span className="chip__dot" style={{ background: label.color }} />
      {label.name}
    </span>
  );
}

export function Chip({ children, color, bg, title }: { children: ReactNode; color?: string; bg?: string; title?: string }) {
  return <span className="chip chip--solid" title={title} style={{ color, background: bg, borderColor: bg ? 'transparent' : undefined }}>{children}</span>;
}

export function DateChip({ date, done, bare }: { date: string; done?: boolean; bare?: boolean }) {
  const d = parseISO(date);
  const overdue = !done && isBefore(d, startOfDay(new Date()));
  return (
    <span className={`date-chip ${overdue ? 'date-chip--overdue' : ''} ${bare ? 'date-chip--bare' : ''}`}>
      <IconCalendar size={13} stroke={1.6} />
      {format(d, 'MMM d')}
    </span>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'outline' | 'danger'; size?: 'sm' | 'md'; icon?: ReactNode };
export function Button({ variant = 'outline', size = 'md', icon, children, className = '', ...rest }: BtnProps) {
  return (
    <button className={`btn btn--${variant} btn--${size} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function Badge({ children, color = 'var(--text-2)', bg = 'var(--bg-hover)' }: { children: ReactNode; color?: string; bg?: string }) {
  return <span className="badge" style={{ color, background: bg }}>{children}</span>;
}

export function Modal({ title, onClose, children, width = 520, footer }: { title: string; onClose(): void; children: ReactNode; width?: number; footer?: ReactNode }) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <span>{title}</span>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng"><IconX size={16} /></button>
        </div>
        <div className="modal__body">{children}</div>
        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  );
}

export function Progress({ value, color = 'var(--accent)', height = 4 }: { value: number; color?: string; height?: number }) {
  return (
    <span className="progress" style={{ height }}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </span>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__title">{title}</div>
      {children && <div className="empty__body">{children}</div>}
    </div>
  );
}
