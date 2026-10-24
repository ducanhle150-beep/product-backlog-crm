// Icon trạng thái / priority / loại issue vẽ tay bằng SVG để giống CRM gốc.
import type { IssueType, Priority, StatusId } from '../../data/types';
import { PRIORITIES, STATUSES, TYPES } from '../../data/meta';

export function StatusIcon({ status, size = 14 }: { status: StatusId; size?: number }) {
  const color = STATUSES.find((s) => s.id === status)!.color;
  const c = size / 2, r = c - 1.5;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }} aria-label={status}>
      {status === 'backlog' && <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="1.5" strokeDasharray="2 2" />}
      {status === 'todo' && <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="1.5" />}
      {(status === 'doing' || status === 'reviewing') && <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="1.8" />}
      {status === 'retest' && (
        <>
          <circle cx={c} cy={c} r={r} fill="none" stroke={color} strokeWidth="1.5" />
          <circle cx={c} cy={c} r={r / 2.2} fill={color} />
        </>
      )}
      {status === 'done' && (
        <>
          <circle cx={c} cy={c} r={r + 0.5} fill={color} />
          <path d={`M${size * 0.3} ${c} l${size * 0.14} ${size * 0.14} l${size * 0.26} -${size * 0.28}`} fill="none" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

export function PriorityIcon({ priority, size = 14 }: { priority: Priority; size?: number }) {
  const color = PRIORITIES[priority].color;
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" style={{ flexShrink: 0 }} aria-label={`priority ${priority}`}>
      {priority === 'medium' && (
        <g stroke={color} strokeWidth="1.8" strokeLinecap="round">
          <line x1="2.5" y1="5" x2="11.5" y2="5" />
          <line x1="2.5" y1="9" x2="11.5" y2="9" />
        </g>
      )}
      {(priority === 'high' || priority === 'urgent') && (
        <g fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3,7 7,3.5 11,7" />
          <polyline points="3,11 7,7.5 11,11" />
        </g>
      )}
      {priority === 'low' && (
        <polyline points="3,5 7,9 11,5" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}

export function TypeIcon({ type, size = 14 }: { type: IssueType; size?: number }) {
  const color = TYPES[type].color;
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" style={{ flexShrink: 0 }} aria-label={TYPES[type].name}>
      <rect x="0.5" y="0.5" width="13" height="13" rx="3" fill={color} />
      {type === 'bug' && <circle cx="7" cy="7" r="2.6" fill="#fff" />}
      {type === 'task' && <polyline points="3.8,7.2 6,9.4 10.2,4.8" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />}
      {type === 'story' && <path d="M4.5 3.5h5v7l-2.5-1.8-2.5 1.8z" fill="#fff" />}
      {type === 'epic' && <path d="M7.8 2.8 4.5 7.6h2.4l-.7 3.6 3.3-4.8H7.1z" fill="#fff" />}
      {type === 'spike' && <path d="M7 3.2v4.6M7 9.6v.9" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />}
      {type === 'techdebt' && <path d="M4 5h6M4 7h6M4 9h4" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />}
      {type === 'improvement' && <polyline points="4,8.5 7,5 10,8.5" fill="none" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}
