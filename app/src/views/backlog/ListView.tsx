import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { DndContext, PointerSensor, closestCenter, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { IconChevronDown, IconChevronRight, IconLayoutList, IconMap, IconPlus, IconSparkles } from '@tabler/icons-react';
import { format, parseISO } from 'date-fns';
import type { Issue, Sprint } from '../../data/types';
import { useStore } from '../../store/useStore';
import { useIssueFilter, useUi } from '../../store/ui';
import { useHealthFilters } from '../../store/hooks';
import { points } from '../../lib/metrics';
import { Badge, Button } from '../../components/ui/primitives';
import { StatusIcon, TypeIcon } from '../../components/ui/icons';
import { BacklogRow } from './BacklogRow';
import { RefinementView, useNeedsRefinement } from './RefinementView';

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
          {issues.length === 0 && <div className="bgroup__empty">Kéo item vào đây</div>}
          {limit && !more && issues.length > limit && (
            <button className="bgroup__more" onClick={() => setMore(true)}>Còn {issues.length - limit} item</button>
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
    return <button className="bgroup__new" onClick={() => setEditing(true)}><IconPlus size={15} /> New item</button>;
  }
  return (
    <div className="quick-create">
      <IconPlus size={15} className="muted" />
      <input
        autoFocus
        className="grow"
        value={title}
        placeholder="Tiêu đề item — Enter để tạo tiếp, Esc để đóng"
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
  const pts = points(issues);
  return (
    <>
      <strong>{sprint.name}</strong>
      <Badge color={sprint.state === 'active' ? '#4ade80' : 'var(--text-2)'} bg={sprint.state === 'active' ? 'var(--success-soft)' : undefined}>
        Planned
      </Badge>
      <span className="muted">
        {format(parseISO(sprint.startDate), 'MMM d')} – {format(parseISO(sprint.endDate), 'MMM d')} · {issues.length} item · {pts} pt
      </span>
      {sprint.goal && <span className="muted truncate" style={{ maxWidth: 420 }}>· {sprint.goal}</span>}
      <span className="grow" />
      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); go('backlog/sprint'); }}>
        Plan sprint
      </Button>
    </>
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
  const filter = useIssueFilter();
  const [view, setView] = useState<'list' | 'map' | 'refine'>('list');
  const { notReady } = useNeedsRefinement();
  const healthFilters = useHealthFilters();
  const { healthFilter, setHealthFilter } = useUi();
  const hf = healthFilter ? healthFilters[healthFilter] : undefined;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const openSprints = sprints.filter((s) => s.state === 'planned').sort((a, b) => a.startDate.localeCompare(b.startDate));
  const visible = useMemo(
    () => issues.filter((i) => i.kind === 'backlog').filter(filter).filter((i) => !hf || hf.test(i)).sort((a, b) => a.rank - b.rank),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [issues, filter, hf?.id, healthFilters],
  );
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
          <button className={view === 'map' ? 'is-active' : ''} onClick={() => setView('map')}><IconMap size={15} /> Story map</button>
          <button className={view === 'refine' ? 'is-active' : ''} onClick={() => setView('refine')}><IconSparkles size={15} /> Refinement{notReady.length > 0 && <span className="subtab__count">{notReady.length}</span>}</button>
        </div>
        <span className="muted small">● = Definition of Ready · số = story point · điểm ưu tiên xem ở tab <button className="link-btn" onClick={() => go('backlog/prioritize')}>Ưu tiên</button></span>
      </div>

      {hf && view !== 'refine' && (
        <div className="hf-banner">
          Đang lọc: <strong>{hf.label}</strong> · {visible.length} item
          <button className="link-btn" onClick={() => setHealthFilter(null)}>Xoá lọc</button>
        </div>
      )}
      {view === 'refine' && <RefinementView />}
      {view === 'map' && <StoryMapView issues={visible} sprints={sprints} />}
      {view === 'list' && (
        <div className="list-scroll">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            {openSprints.map((s) => (
              <Group key={s.id} id={s.id} issues={groups.get(s.id)!} header={<SprintHeader sprint={s} issues={groups.get(s.id)!} go={go} />} />
            ))}
            <Group
              id={BACKLOG}
              issues={backlogIssues}
              limit={PAGE}
              header={<><strong>Backlog</strong><span className="muted">Item chưa thuộc sprint nào · {backlogIssues.length} item · {points(backlogIssues)} pt</span></>}
              footer={<QuickCreate />}
            />
          </DndContext>
        </div>
      )}
    </div>
  );
}
