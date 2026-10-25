import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { DndContext, PointerSensor, closestCenter, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { IconChevronDown, IconChevronRight, IconLayoutColumns, IconLayoutList, IconMap, IconPlus } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import type { Issue, Sprint } from '../../data/types';
import { useStore } from '../../store/useStore';
import { useIssueFilter } from '../../store/ui';
import { useScoring } from '../../store/hooks';
import { averageVelocity, points } from '../../lib/metrics';
import { rankByMethod } from '../../lib/prioritization';
import { Badge, Button } from '../../components/ui/primitives';
import { PriorityIcon, StatusIcon, TypeIcon } from '../../components/ui/icons';
import { BacklogRow, ScoreBadge } from './BacklogRow';

const BACKLOG = 'backlog';
const PAGE = 20;

function Group({ id, header, issues, footer, limit }: { id: string; header: ReactNode; issues: Issue[]; footer?: ReactNode; limit?: number }) {
  const [open, setOpen] = useState(true);
  const [more, setMore] = useState(false);
  const { setNodeRef, isOver } = useDroppable({ id: `grp:${id}` });
  const shown = limit && !more ? issues.slice(0, limit) : issues;
  return (
    <div ref={setNodeRef} className={`bgroup ${isOver ? 'is-over' : ''}`}>
      <div className="bgroup__head" onClick={() => setOpen(!open)}>
        {open ? <IconChevronDown size={15} /> : <IconChevronRight size={15} />}
        {header}
      </div>
      {open && (
        <SortableContext items={shown.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {shown.map((i) => <BacklogRow key={i.id} issue={i} />)}
          {issues.length === 0 && <div className="bgroup__empty">Kéo issue vào đây</div>}
          {limit && !more && issues.length > limit && (
            <button className="bgroup__more" onClick={() => setMore(true)}>Còn {issues.length - limit} issue</button>
          )}
          {footer}
        </SortableContext>
      )}
    </div>
  );
}

function QuickCreate() {
  const createIssue = useStore((s) => s.createIssue);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  if (!editing) {
    return <button className="bgroup__new" onClick={() => setEditing(true)}><IconPlus size={15} /> New issue</button>;
  }
  return (
    <div className="quick-create">
      <IconPlus size={15} className="muted" />
      <input
        autoFocus
        className="grow"
        value={title}
        placeholder="Tiêu đề issue — Enter để tạo tiếp, Esc để đóng"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { setEditing(false); setTitle(''); }
          if (e.key === 'Enter' && title.trim()) { createIssue({ title: title.trim() }); setTitle(''); }
        }}
        onBlur={() => !title && setEditing(false)}
      />
    </div>
  );
}

function SprintHeader({ sprint, issues, go }: { sprint: Sprint; issues: Issue[]; go(p: string): void }) {
  const capacity = Object.values(sprint.capacity).reduce((a, b) => a + b, 0);
  const pts = points(issues);
  return (
    <>
      <strong>{sprint.name}</strong>
      <Badge color={sprint.state === 'active' ? '#4ade80' : 'var(--text-2)'} bg={sprint.state === 'active' ? 'var(--success-soft)' : undefined}>
        Planned
      </Badge>
      <span className="muted">
        {format(parseISO(sprint.startDate), 'MMM d')} – {format(parseISO(sprint.endDate), 'MMM d')} · {issues.length} issue · {pts}
        {capacity ? ` / ${capacity}` : ''} pt
      </span>
      {sprint.goal && <span className="muted truncate" style={{ maxWidth: 420 }}>· {sprint.goal}</span>}
      <span className="grow" />
      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); go('backlog/sprint'); }}>
        Plan sprint
      </Button>
    </>
  );
}

/** Bucket kiểu ProductPlan: P1 = vừa sprint tới (theo velocity), P2 ≈ 3 tháng, còn lại Longer-term; bug tách riêng. */
function BucketsView({ issues }: { issues: Issue[] }) {
  const sprints = useStore((s) => s.sprints);
  const all = useStore((s) => s.issues);
  const { method, settings } = useScoring();
  const openIssue = useStore((s) => s.openIssue);
  const velocity = averageVelocity(sprints, all) || 30;
  const ranked = rankByMethod(issues.filter((i) => i.type !== 'bug'), method, settings);
  const buckets: Record<string, Issue[]> = { p1: [], p2: [], long: [], bugs: issues.filter((i) => i.type === 'bug') };
  let acc = 0;
  for (const { issue } of ranked) {
    acc += issue.storyPoints ?? 3;
    buckets[acc <= velocity ? 'p1' : acc <= velocity * 6 ? 'p2' : 'long'].push(issue);
  }
  const cols = [
    { id: 'p1', name: 'High priority', sub: `Sprint tới · ≤ ${velocity} pt (velocity TB)`, color: '#22c55e' },
    { id: 'p2', name: 'Second-level priority', sub: '≈ 3 tháng tới (6 sprint)', color: '#3b82f6' },
    { id: 'long', name: 'Longer-term', sub: 'Cân nhắc chuyển sang Parking lot', color: '#8a8a8a' },
    { id: 'bugs', name: 'Bugs', sub: 'Theo severity', color: '#e5484d' },
  ];
  return (
    <div className="buckets">
      {cols.map((c) => (
        <section key={c.id} className="bucket">
          <header>
            <span className="bucket__bar" style={{ background: c.color }} />
            <div>
              <strong>{c.name}</strong> <span className="muted">{buckets[c.id].length} · {points(buckets[c.id])} pt</span>
              <div className="muted small">{c.sub}</div>
            </div>
          </header>
          {buckets[c.id].map((i) => (
            <button key={i.id} className="mini-card" onClick={() => openIssue(i.id)}>
              <div className="row">
                <PriorityIcon priority={i.priority} />
                <TypeIcon type={i.type} />
                <span className="issue-key">{i.key}</span>
                <span className="grow" />
                <ScoreBadge issue={i} />
              </div>
              <div className="mini-card__title">{i.title}</div>
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}

function StoryMapView({ issues, sprints }: { issues: Issue[]; sprints: Sprint[] }) {
  const epics = useStore((s) => s.epics);
  const openIssue = useStore((s) => s.openIssue);
  const lanes = [
    ...sprints.filter((s) => s.state === 'planned').map((s) => ({ id: s.id, name: s.name })),
    { id: BACKLOG, name: 'Backlog' },
  ];
  const cell = (list: Issue[]) =>
    list.map((i) => (
      <button key={i.id} className="map-card" onClick={() => openIssue(i.id)}>
        <span className="row"><StatusIcon status={i.status} size={12} /><span className="issue-key small">{i.key}</span><span className="grow" /><span className="muted small">{i.storyPoints ?? '–'}</span></span>
        <span className="map-card__title">{i.title}</span>
      </button>
    ));
  const laneOf = (i: Issue) => i.sprintId ?? BACKLOG;
  return (
    <div className="storymap">
      <div className="storymap__grid" style={{ gridTemplateColumns: `140px repeat(${epics.length}, 220px)` }}>
        <div />
        {epics.map((e) => (
          <div key={e.id} className="storymap__epic" style={{ borderTopColor: e.color }}>
            <TypeIcon type="epic" /> <strong className="truncate">{e.name}</strong>
            <span className="muted small">{issues.filter((i) => i.epicId === e.id).length}</span>
          </div>
        ))}
        {lanes.map((l) => (
          <div key={l.id} style={{ display: 'contents' }}>
            <div className="storymap__lane">{l.name}</div>
            {epics.map((e) => (
              <div key={e.id} className="storymap__cell">{cell(issues.filter((i) => i.epicId === e.id && laneOf(i) === l.id))}</div>
            ))}
          </div>
        ))}
      </div>
      <aside className="storymap__side">
        <div className="section-title">Chưa có epic ({issues.filter((i) => !i.epicId).length})</div>
        {cell(issues.filter((i) => !i.epicId))}
      </aside>
    </div>
  );
}

export function ListView({ go }: { go(path: string): void }) {
  const issues = useStore((s) => s.issues);
  const sprints = useStore((s) => s.sprints);
  const reorder = useStore((s) => s.reorder);
  const moveToSprint = useStore((s) => s.moveToSprint);
  const createSprint = useStore((s) => s.createSprint);
  const filter = useIssueFilter();
  const { method } = useScoring();
  const [view, setView] = useState<'list' | 'buckets' | 'map'>('list');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const openSprints = sprints.filter((s) => s.state === 'planned').sort((a, b) => a.startDate.localeCompare(b.startDate));
  const active = sprints.find((s) => s.state === 'active');
  const activeTasks = active ? issues.filter((i) => i.sprintId === active.id && i.kind === 'task' && !i.archived) : [];
  const visible = useMemo(() => issues.filter((i) => i.kind === 'backlog').filter(filter).sort((a, b) => a.rank - b.rank), [issues, filter]);
  const groups = useMemo(() => {
    const g = new Map<string, Issue[]>();
    for (const s of openSprints) g.set(s.id, visible.filter((i) => i.sprintId === s.id));
    g.set(BACKLOG, visible.filter((i) => !i.sprintId));
    return g;
  }, [visible, openSprints]);

  const groupOf = (id: string) => {
    if (id.startsWith('grp:')) return id.slice(4);
    for (const [gid, list] of groups) if (list.some((i) => i.id === id)) return gid;
    return null;
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over) return;
    const activeId = String(e.active.id), overId = String(e.over.id);
    const from = groupOf(activeId), to = groupOf(overId);
    if (!from || !to) return;
    if (from !== to) moveToSprint(activeId, to === BACKLOG ? undefined : to);
    const list = groups.get(to)!.map((i) => i.id).filter((id) => id !== activeId);
    const overIdx = overId.startsWith('grp:') ? list.length : list.indexOf(overId);
    if (from === to) {
      const ids = groups.get(to)!.map((i) => i.id);
      reorder(arrayMove(ids, ids.indexOf(activeId), ids.indexOf(overId)));
    } else {
      list.splice(overIdx < 0 ? list.length : overIdx, 0, activeId);
      reorder(list);
    }
  };

  const backlogIssues = groups.get(BACKLOG)!;

  return (
    <div className="list-view">
      <div className="subbar">
        <div className="seg seg--sm">
          <button className={view === 'list' ? 'is-active' : ''} onClick={() => setView('list')}><IconLayoutList size={15} /> List</button>
          <button className={view === 'buckets' ? 'is-active' : ''} onClick={() => setView('buckets')}><IconLayoutColumns size={15} /> Buckets</button>
          <button className={view === 'map' ? 'is-active' : ''} onClick={() => setView('map')}><IconMap size={15} /> Story map</button>
        </div>
        <span className="muted small">Điểm theo <button className="link-btn" onClick={() => go('backlog/prioritize')}>{method.name}</button> · ● = Definition of Ready · số = story point</span>
      </div>

      {view === 'buckets' && <BucketsView issues={backlogIssues} />}
      {view === 'map' && <StoryMapView issues={visible} sprints={sprints} />}
      {view === 'list' && (
        <div className="list-scroll">
          {active && (
            <button className="active-sprint-link" onClick={() => go('board')}>
              <StatusIcon status="doing" /> <strong>{active.name}</strong> đang chạy · {activeTasks.length} task · {points(activeTasks)} pt đã chuyển sang Bảng <span className="link-btn">Mở Bảng →</span>
            </button>
          )}
          <button className="create-sprint" onClick={() => createSprint()}><IconPlus size={15} /> Tạo sprint</button>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            {openSprints.map((s) => (
              <Group key={s.id} id={s.id} issues={groups.get(s.id)!} header={<SprintHeader sprint={s} issues={groups.get(s.id)!} go={go} />} />
            ))}
            <Group
              id={BACKLOG}
              issues={backlogIssues}
              limit={PAGE}
              header={<><strong>Backlog</strong><span className="muted">Issue chưa thuộc sprint nào · {backlogIssues.length} issue · {points(backlogIssues)} pt</span></>}
              footer={<QuickCreate />}
            />
          </DndContext>
        </div>
      )}
    </div>
  );
}
