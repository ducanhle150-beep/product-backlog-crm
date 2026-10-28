import { useMemo, useState } from 'react';
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { IconCalendarEvent, IconPlus } from '@tabler/icons-react';
import { differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { Issue, StatusId } from '../../data/types';
import { LABELS } from '../../data/seed';
import { BOARD_STATUSES } from '../../data/meta';
import { useStore } from '../../store/useStore';
import { useIssueFilter } from '../../store/ui';
import { PriorityIcon, StatusIcon, TypeIcon } from '../../components/ui/icons';
import { Avatar, DateChip, LabelChip, memberById } from '../../components/ui/primitives';
import { BoardFilterRight, FilterBar } from '../../components/shell/Toolbar';
import './board.css';

const COLUMN_LIMIT = 20;

function Card({ issue }: { issue: Issue }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: issue.id });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 10 } : undefined;
  const openIssue = useStore((s) => s.openIssue);
  const labels = LABELS.filter((l) => issue.labelIds.includes(l.id));
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`kcard ${isDragging ? 'is-dragging' : ''}`}
      onClick={() => openIssue(issue.id)}
      {...listeners}
      {...attributes}
    >
      <div className="kcard__top">
        <PriorityIcon priority={issue.priority} />
        <TypeIcon type={issue.type} />
        <span className="issue-key">{issue.key}</span>
        <span className="grow" />
        {issue.reporterId && <Avatar member={memberById(issue.reporterId)} size={17} dim />}
        <Avatar member={memberById(issue.assigneeId)} size={20} />
      </div>
      <div className="kcard__title">{issue.title}</div>
      {(labels.length > 0 || issue.dueDate) && (
        <div className="kcard__meta">
          {labels.map((l) => <LabelChip key={l.id} label={l} />)}
          {issue.dueDate && <DateChip date={issue.dueDate} done={issue.status === 'done'} />}
        </div>
      )}
    </div>
  );
}

function Column({ status, issues }: { status: (typeof BOARD_STATUSES)[number]; issues: Issue[] }) {
  const [expanded, setExpanded] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: status.id });
  const createIssue = useStore((s) => s.createIssue);
  const activeSprintId = useStore((s) => s.sprints.find((sp) => sp.state === 'active')?.id);
  const shown = expanded ? issues : issues.slice(0, COLUMN_LIMIT);
  return (
    <section ref={setNodeRef} className={`kcol ${isOver ? 'is-over' : ''} ${issues.length === 0 ? 'kcol--empty' : ''}`}>
      <header className="kcol__head">
        <StatusIcon status={status.id} size={15} />
        <strong>{status.name}</strong>
        <span className="muted">{issues.length}</span>
      </header>
      <div className="kcol__body">
        {shown.map((i) => <Card key={i.id} issue={i} />)}
        {!expanded && issues.length > COLUMN_LIMIT && (
          <button className="kcol__more" onClick={() => setExpanded(true)}>Còn {issues.length - COLUMN_LIMIT} issue</button>
        )}
      </div>
      <button className="kcol__new" onClick={() => createIssue({ title: 'Issue mới', kind: 'task', status: status.id, sprintId: activeSprintId })}>
        <IconPlus size={15} /> New issue
      </button>
    </section>
  );
}

export function KanbanBoard({ go }: { go(path: string): void }) {
  const issues = useStore((s) => s.issues);
  const sprints = useStore((s) => s.sprints);
  const updateIssue = useStore((s) => s.updateIssue);
  const filter = useIssueFilter();
  const [sprintOnly, setSprintOnly] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const active = sprints.find((s) => s.state === 'active');
  const visible = useMemo(
    () => issues.filter((i) => i.kind === 'task').filter(filter).filter((i) => !sprintOnly || !active || i.sprintId === active.id).sort((a, b) => a.rank - b.rank),
    [issues, filter, sprintOnly, active],
  );
  const all = issues.filter((i) => i.kind === 'task' && !i.archived);

  const onDragEnd = (e: DragEndEvent) => {
    const to = e.over?.id as StatusId | undefined;
    const issue = issues.find((i) => i.id === e.active.id);
    if (!to || !issue || issue.status === to) return;
    updateIssue(issue.id, { status: to }, `Chuyển trạng thái → ${BOARD_STATUSES.find((s) => s.id === to)!.name}`);
  };

  const daysLeft = active ? differenceInCalendarDays(parseISO(active.endDate), new Date()) : 0;

  return (
    <>
      <FilterBar right={<BoardFilterRight done={all.filter((i) => i.status === 'done').length} total={all.length} />} />
      <div className="sprint-banner">
        <IconCalendarEvent size={16} stroke={1.6} />
        {active ? (
          <>
            <span>
              <strong>{active.name}</strong> · {format(parseISO(active.startDate), 'MMM d')} – {format(parseISO(active.endDate), 'MMM d')} · còn {Math.max(0, daysLeft)} ngày
            </span>
            <span className="muted truncate">— {active.goal}</span>
            <label className="row small muted" style={{ marginLeft: 'auto', gap: 6, cursor: 'pointer' }}>
              <input type="checkbox" checked={sprintOnly} onChange={(e) => setSprintOnly(e.target.checked)} /> Chỉ sprint hiện tại
            </label>
            <button className="link" style={{ marginLeft: 16 }} onClick={() => go('backlog/sprint')}>Sprint Planning</button>
          </>
        ) : (
          <>
            <span>No active sprint. Showing every issue in the project.</span>
            <button className="link" onClick={() => go('backlog/sprint')}>Plan a sprint</button>
          </>
        )}
      </div>
      <DndContext sensors={sensors} onDragEnd={onDragEnd}>
        <div className="board">
          {BOARD_STATUSES.map((s) => <Column key={s.id} status={s} issues={visible.filter((i) => i.status === s.id)} />)}
          <button className="board__add" aria-label="Thêm cột"><IconPlus size={16} /></button>
        </div>
      </DndContext>

    </>
  );
}
