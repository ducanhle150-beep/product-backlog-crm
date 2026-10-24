import { useState } from 'react';
import type { ReactNode } from 'react';
import { IconArchive, IconCheck, IconPlus, IconX } from '@tabler/icons-react';
import { differenceInCalendarDays, format } from 'date-fns';
import type { Issue, RetroBoard, Sprint } from '../../data/types';
import { useStore } from '../../store/useStore';
import { useBacklogIssues, useScoring } from '../../store/hooks';
import { isStale, points, sprintIssues } from '../../lib/metrics';
import { rankByMethod } from '../../lib/prioritization';
import { StatusIcon, TypeIcon } from '../../components/ui/icons';
import { Badge, Button, Progress } from '../../components/ui/primitives';
import './review.css';

const REVIEW_ITEMS = [
  { id: 'r1', text: 'Đưa item mới từ Ideas inbox vào (hoặc từ chối)' },
  { id: 'r2', text: 'Kiểm tra tổ chức: epic, label, strategic goal' },
  { id: 'r3', text: 'Kiểm tra vision alignment — item nào không phục vụ "why" thì loại' },
  { id: 'r4', text: 'Đánh giá lại nhóm ưu tiên 1 & 2 (top backlog)' },
  { id: 'r5', text: 'Chuyển item ưu tiên thấp sang Longer-term / Parking lot' },
  { id: 'r6', text: 'Cập nhật estimate khi có thông tin mới' },
];

function IssueLine({ issue, right }: { issue: Issue; right?: ReactNode }) {
  const openIssue = useStore((s) => s.openIssue);
  return (
    <div className="rv-line">
      <StatusIcon status={issue.status} /><TypeIcon type={issue.type} /><span className="issue-key">{issue.key}</span>
      <button className="truncate grow" style={{ textAlign: 'left' }} onClick={() => openIssue(issue.id)}>{issue.title}</button>
      {right}
    </div>
  );
}

function BacklogReview() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const archiveIssue = useStore((s) => s.archiveIssue);
  const backlog = useBacklogIssues();
  const { method } = useScoring();
  const now = new Date();
  const days = settings.lastBacklogReviewAt ? differenceInCalendarDays(now, new Date(settings.lastBacklogReviewAt)) : 99;
  const noGoal = backlog.filter((i) => !i.goalId);
  const noWhy = backlog.filter((i) => !i.whyNow.trim());
  const stale = backlog.filter((i) => isStale(i, settings.staleMonths, now));
  const low = rankByMethod(backlog, method, settings).filter((r) => r.cls && r.cls.order >= 4).map((r) => r.issue);
  const done = REVIEW_ITEMS.filter((r) => settings.reviewChecklist[r.id]).length;

  return (
    <div className="rv-grid">
      <div className="card">
        <div className="card__head">
          Backlog review định kỳ
          <span className="grow" />
          <Badge color={days > 7 ? '#fbbf24' : '#4ade80'} bg={days > 7 ? '#2e2410' : 'var(--success-soft)'}>Lần cuối: {days === 0 ? 'hôm nay' : `${days} ngày trước`}</Badge>
        </div>
        <div className="card__body">
          <p className="muted small" style={{ marginTop: 0 }}>Thói quen PM: ~1 giờ mỗi vài ngày, triage inbox hàng tuần, review ưu tiên hàng quý theo strategic goal.</p>
          {REVIEW_ITEMS.map((r) => (
            <label key={r.id} className="check">
              <input type="checkbox" checked={!!settings.reviewChecklist[r.id]} onChange={(e) => updateSettings({ reviewChecklist: { ...settings.reviewChecklist, [r.id]: e.target.checked } })} />
              <span>{r.text}</span>
            </label>
          ))}
          <div className="row" style={{ marginTop: 10 }}>
            <span style={{ width: 160 }}><Progress value={(done / REVIEW_ITEMS.length) * 100} color="var(--success)" /></span>
            <span className="muted small">{done}/{REVIEW_ITEMS.length}</span>
            <span className="grow" />
            <Button size="sm" variant="primary" icon={<IconCheck size={14} />} onClick={() => updateSettings({ lastBacklogReviewAt: new Date().toISOString(), reviewChecklist: {} })}>Hoàn tất review</Button>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card__head">Câu hỏi trước khi giữ một item</div>
        <div className="card__body small">
          <div className="rv-q">Vì sao ticket này ở đây?</div>
          <div className="rv-q">Nó có tác động tích cực tới "why" của sản phẩm không?</div>
          <div className="rv-q">Nếu không làm bây giờ, có nên giữ không?</div>
          <div className="rv-q">Không giải thích được vì sao nó ưu tiên cao → nó chưa sẵn sàng nằm trong backlog.</div>
        </div>
      </div>
      {[
        { title: `Không gắn strategic goal · ${noGoal.length}`, list: noGoal },
        { title: `Thiếu "why now" · ${noWhy.length}`, list: noWhy },
        { title: `${method.name}: nhóm thấp nhất · ${low.length}`, list: low },
        { title: `Stale > ${settings.staleMonths} tháng · ${stale.length}`, list: stale },
      ].map((g) => (
        <div key={g.title} className="card">
          <div className="card__head">{g.title}</div>
          <div className="card__body rv-list">
            {g.list.length === 0 && <div className="muted small">Không có — tốt.</div>}
            {g.list.map((i) => <IssueLine key={i.id} issue={i} right={<button className="icon-btn" title="Lưu trữ" onClick={() => archiveIssue(i.id)}><IconArchive size={14} /></button>} />)}
          </div>
        </div>
      ))}
    </div>
  );
}

function SprintPicker({ sprints, value, onChange }: { sprints: Sprint[]; value?: string; onChange(id: string): void }) {
  return (
    <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
      {sprints.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.state === 'active' ? 'đang chạy' : 'done'})</option>)}
    </select>
  );
}

function SprintReview({ sprint }: { sprint: Sprint }) {
  const issues = useStore((s) => s.issues);
  const settings = useStore((s) => s.settings);
  const updateSprint = useStore((s) => s.updateSprint);
  const items = sprintIssues(sprint, issues);
  const done = items.filter((i) => i.status === 'done');
  const notDone = items.filter((i) => i.status !== 'done');
  return (
    <div className="rv-grid">
      <div className="card">
        <div className="card__head">Demo · item đã done ({done.length}) <span className="grow" /><span className="muted small">{points(done)} pt</span></div>
        <div className="card__body rv-list">
          {done.length === 0 && <div className="muted small">Chưa có item done.</div>}
          {done.map((i) => {
            const dod = settings.dodItems.filter((d) => i.dod[d.id]).length;
            return (
              <div key={i.id}>
                <IssueLine issue={i} right={<Badge color={dod === settings.dodItems.length ? '#4ade80' : '#fbbf24'} bg={dod === settings.dodItems.length ? 'var(--success-soft)' : '#2e2410'}>DoD {dod}/{settings.dodItems.length}</Badge>} />
                <div className="muted small rv-metric">{i.successMetric ? `Success metric: ${i.successMetric}` : 'Chưa định nghĩa success metric — "Done" chưa chứng minh được giá trị.'}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div className="card">
        <div className="card__head">Chưa xong ({notDone.length})</div>
        <div className="card__body rv-list">{notDone.map((i) => <IssueLine key={i.id} issue={i} />)}</div>
      </div>
      <div className="card">
        <div className="card__head">Feedback stakeholder</div>
        <div className="card__body">
          <textarea className="textarea" rows={5} style={{ width: '100%' }} placeholder="Stakeholder xem demo, hỏi gì, góp ý gì? → tạo idea/item mới từ đây" value={sprint.stakeholderFeedback} onChange={(e) => updateSprint(sprint.id, { stakeholderFeedback: e.target.value })} />
        </div>
      </div>
      <div className="card">
        <div className="card__head">Ghi chú review</div>
        <div className="card__body">
          <textarea className="textarea" rows={5} style={{ width: '100%' }} placeholder="Sprint review là demo + feedback, không phải retrospective." value={sprint.reviewNotes} onChange={(e) => updateSprint(sprint.id, { reviewNotes: e.target.value })} />
        </div>
      </div>
    </div>
  );
}

const RETRO_COLS: { key: keyof Omit<RetroBoard, 'actions'>; title: string; color: string }[] = [
  { key: 'well', title: 'Điều gì tốt?', color: '#22c55e' },
  { key: 'wrong', title: 'Điều gì chưa tốt?', color: '#ef4444' },
  { key: 'learned', title: 'Học được gì?', color: '#3b82f6' },
  { key: 'improve', title: 'Cải thiện gì?', color: '#f59e0b' },
];

function Retro({ sprint }: { sprint: Sprint }) {
  const updateSprint = useStore((s) => s.updateSprint);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const retro = sprint.retro;
  const set = (patch: Partial<RetroBoard>) => updateSprint(sprint.id, { retro: { ...retro, ...patch } });
  const add = (key: string) => {
    const text = drafts[key]?.trim();
    if (!text) return;
    if (key === 'actions') set({ actions: [...retro.actions, { id: `a${Date.now()}`, text, done: false }] });
    else set({ [key]: [...retro[key as keyof Omit<RetroBoard, 'actions'>], text] } as Partial<RetroBoard>);
    setDrafts({ ...drafts, [key]: '' });
  };
  return (
    <>
      <p className="muted small" style={{ marginTop: 0 }}>Tối đa 3 giờ cho sprint 1 tháng. Kết thúc bằng action item cụ thể cho sprint sau.</p>
      <div className="retro">
        {RETRO_COLS.map((c) => (
          <div key={c.key} className="retro__col" style={{ borderTopColor: c.color }}>
            <strong>{c.title}</strong>
            {retro[c.key].map((t, i) => (
              <div key={i} className="retro__note">
                <span className="grow">{t}</span>
                <button onClick={() => set({ [c.key]: retro[c.key].filter((_, k) => k !== i) } as Partial<RetroBoard>)}><IconX size={12} /></button>
              </div>
            ))}
            <input className="input" placeholder="+ Thêm (Enter)" value={drafts[c.key] ?? ''} onChange={(e) => setDrafts({ ...drafts, [c.key]: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add(c.key)} />
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        <div className="card__head">Action items</div>
        <div className="card__body">
          {retro.actions.map((a) => (
            <label key={a.id} className="check">
              <input type="checkbox" checked={a.done} onChange={(e) => set({ actions: retro.actions.map((x) => (x.id === a.id ? { ...x, done: e.target.checked } : x)) })} />
              <span style={{ textDecoration: a.done ? 'line-through' : undefined }}>{a.text}</span>
            </label>
          ))}
          <div className="row">
            <input className="input grow" placeholder="Hành động cụ thể, có người chịu trách nhiệm" value={drafts.actions ?? ''} onChange={(e) => setDrafts({ ...drafts, actions: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && add('actions')} />
            <Button size="sm" icon={<IconPlus size={14} />} onClick={() => add('actions')}>Thêm</Button>
          </div>
        </div>
      </div>
    </>
  );
}

export function ReviewView() {
  const sprints = useStore((s) => s.sprints);
  const [tab, setTab] = useState<'backlog' | 'sprint' | 'retro'>('backlog');
  const reviewable = sprints.filter((s) => s.state !== 'planned').sort((a, b) => b.startDate.localeCompare(a.startDate));
  const [sprintId, setSprintId] = useState(reviewable[0]?.id);
  const sprint = sprints.find((s) => s.id === sprintId);
  return (
    <div className="view-scroll">
      <div className="row" style={{ marginBottom: 14 }}>
        <div className="seg seg--sm">
          <button className={tab === 'backlog' ? 'is-active' : ''} onClick={() => setTab('backlog')}>Backlog review</button>
          <button className={tab === 'sprint' ? 'is-active' : ''} onClick={() => setTab('sprint')}>Sprint review</button>
          <button className={tab === 'retro' ? 'is-active' : ''} onClick={() => setTab('retro')}>Retrospective</button>
        </div>
        {tab !== 'backlog' && <SprintPicker sprints={reviewable} value={sprintId} onChange={setSprintId} />}
        {tab !== 'backlog' && sprint && <span className="muted small">{format(new Date(sprint.startDate), 'MMM d')} – {format(new Date(sprint.endDate), 'MMM d')}</span>}
      </div>
      {tab === 'backlog' && <BacklogReview />}
      {tab === 'sprint' && sprint && <SprintReview key={sprint.id} sprint={sprint} />}
      {tab === 'retro' && sprint && <Retro key={sprint.id} sprint={sprint} />}
    </div>
  );
}
