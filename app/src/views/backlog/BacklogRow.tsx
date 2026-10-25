import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconGripVertical, IconLock } from '@tabler/icons-react';
import type { Issue } from '../../data/types';
import { useStore } from '../../store/useStore';
import { useScoring } from '../../store/hooks';
import { formatScore } from '../../lib/prioritization';
import { unresolvedBlockers } from '../../lib/readiness';
import { PriorityIcon, StatusIcon, TypeIcon } from '../../components/ui/icons';
import { Avatar, DateChip, memberById } from '../../components/ui/primitives';

export function ReadyDot({ pct }: { pct: number }) {
  const color = pct === 100 ? 'var(--success)' : pct >= 60 ? '#f59e0b' : '#555';
  return <span className="ready-dot" style={{ borderColor: color, background: pct === 100 ? color : 'transparent' }} title={`Definition of Ready: ${pct}%`} />;
}

export function EpicChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="chip epic-chip" title={`Epic: ${name}`} style={{ borderColor: `${color}55`, color }}>
      <TypeIcon type="epic" size={12} />
      <span className="epic-chip__name">{name}</span>
    </span>
  );
}

export function ScoreBadge({ issue }: { issue: Issue }) {
  const { method, score } = useScoring();
  const s = score(issue);
  if (s.score === null) return <span className="score-badge score-badge--empty" title={`Chưa chấm ${method.name}`}>—</span>;
  const text = formatScore(method, s.score);
  return (
    <span className="score-badge" style={{ borderColor: s.cls?.color, color: s.cls?.color ?? 'var(--text)' }} title={s.cls?.label ?? method.name}>
      {s.cls && <span className="score-badge__dot" style={{ background: s.cls.color }} />}
      {text || s.cls?.label}
    </span>
  );
}

export function BacklogRow({ issue, showType }: { issue: Issue; showType?: boolean }) {
  const openIssue = useStore((s) => s.openIssue);
  const { ready, byId } = useScoring();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: issue.id });
  const epic = useStore((s) => s.epics.find((e) => e.id === issue.epicId));
  const blockers = unresolvedBlockers(issue, byId);
  const r = ready(issue);
  return (
    <div
      ref={setNodeRef}
      className={`brow ${isDragging ? 'is-dragging' : ''}`}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      onClick={() => openIssue(issue.id)}
    >
      <span className="brow__grip" {...listeners} {...attributes} onClick={(e) => e.stopPropagation()}>
        <IconGripVertical size={14} />
      </span>
      <PriorityIcon priority={issue.priority} />
      <StatusIcon status={issue.status} />
      {showType && <TypeIcon type={issue.type} />}
      <span className="issue-key brow__key">{issue.key}</span>
      <span className="brow__title truncate">{issue.title}</span>
      {blockers.length > 0 && (
        <span className="blocked" title={`Bị block bởi ${blockers.map((b) => b.key).join(', ')}`}>
          <IconLock size={12} /> {blockers[0].key}
        </span>
      )}
      <span className="grow" />
      <span className="brow__labels">
        {epic && <EpicChip name={epic.name} color={epic.color} />}
      </span>
      <ReadyDot pct={r.pct} />
      <span className="brow__pts" title="Story point">{issue.storyPoints ?? '–'}</span>
      <span className="brow__due">{issue.dueDate && <DateChip date={issue.dueDate} done={issue.status === 'done'} bare />}</span>
      <Avatar member={memberById(issue.assigneeId)} size={20} />
    </div>
  );
}
