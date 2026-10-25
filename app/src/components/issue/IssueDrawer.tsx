import { useState } from 'react';
import type { ReactNode } from 'react';
import { IconArchive, IconArrowRight, IconLock, IconPlus, IconTrash, IconX } from '@tabler/icons-react';
import { format } from 'date-fns';
import type { Issue, IssueType, Priority, Source, TShirt } from '../../data/types';
import { LABELS, MEMBERS } from '../../data/seed';
import { PRIORITIES, SEVERITY, SOURCES, TYPES } from '../../data/meta';
import { useStore } from '../../store/useStore';
import { useScoring } from '../../store/hooks';
import { methodById } from '../../lib/prioritization';
import { investChecks, unresolvedBlockers } from '../../lib/readiness';
import type { CheckResult } from '../../lib/readiness';
import { StatusIcon, TypeIcon } from '../ui/icons';
import { Button, Progress } from '../ui/primitives';
import { ScoreEditor } from './ScoreEditor';
import './drawer.css';

const FIB = [1, 2, 3, 5, 8, 13, 20];

function Prop({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="prop">
      <span className="prop__label">{label}</span>
      <div className="prop__value">{children}</div>
    </div>
  );
}

function Section({ title, right, children }: { title: string; right?: ReactNode; children: ReactNode }) {
  return (
    <section className="dsec">
      <div className="dsec__head"><span className="section-title" style={{ margin: 0 }}>{title}</span>{right}</div>
      {children}
    </section>
  );
}

function Checklist({ items, onToggle }: { items: CheckResult[]; onToggle(id: string, v: boolean): void }) {
  return (
    <div>
      {items.map((c) => (
        <label key={c.id} className={`check ${c.auto ? 'check--auto' : ''}`} title={c.auto ? 'Tự động suy ra từ dữ liệu issue' : undefined}>
          <input type="checkbox" checked={c.ok} disabled={c.auto} onChange={(e) => onToggle(c.id, e.target.checked)} />
          <span className="grow">{c.text}</span>
          {c.auto && <span className="muted small">tự động</span>}
        </label>
      ))}
    </div>
  );
}

function DrawerBody({ issue }: { issue: Issue }) {
  const store = useStore();
  const { updateIssue, epics, sprints, settings, issues } = store;
  const { ready, byId } = useScoring();
  const [newAc, setNewAc] = useState('');
  const up = (patch: Partial<Issue>, activity?: string) => updateIssue(issue.id, patch, activity);
  const r = ready(issue);
  const invest = investChecks(issue, byId);
  const blockers = unresolvedBlockers(issue, byId);
  const blocks = issues.filter((i) => i.blockedBy.includes(issue.id));
  const story = issue.userStory ?? { asA: '', iWant: '', soThat: '' };

  return (
    <>
      <div className="drawer__title">
        <input className="drawer__title-input" value={issue.title} onChange={(e) => up({ title: e.target.value })} />
      </div>

      <div className="props">
        <Prop label="Vị trí">
          <span className="row"><StatusIcon status="backlog" /><span>Product Backlog{issue.sprintId ? ` · ${sprints.find((s) => s.id === issue.sprintId)?.name}` : ''}</span></span>
        </Prop>
        <Prop label="Loại">
          <span className="row"><TypeIcon type={issue.type} />
            <select className="select select--bare" value={issue.type} onChange={(e) => up({ type: e.target.value as IssueType })}>
              {(Object.keys(TYPES) as IssueType[]).filter((t) => t !== 'epic').map((t) => <option key={t} value={t}>{TYPES[t].name}</option>)}
            </select>
          </span>
        </Prop>
        <Prop label="Priority">
          <select className="select select--bare" value={issue.priority} onChange={(e) => up({ priority: e.target.value as Priority })}>
            {(Object.keys(PRIORITIES) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITIES[p].name}</option>)}
          </select>
        </Prop>
        <Prop label="Assignee">
          <select className="select select--bare" value={issue.assigneeId ?? ''} onChange={(e) => up({ assigneeId: e.target.value || undefined })}>
            <option value="">Chưa assign</option>
            {MEMBERS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </Prop>
        <Prop label="Sprint">
          <select className="select select--bare" value={issue.sprintId ?? ''} onChange={(e) => store.moveToSprint(issue.id, e.target.value || undefined)}>
            <option value="">Chưa vào sprint</option>
            {sprints.filter((s) => s.state === 'planned').map((s) => <option key={s.id} value={s.id}>{s.name} (planned)</option>)}
          </select>
        </Prop>
        <Prop label="Epic">
          <select className="select select--bare" value={issue.epicId ?? ''} onChange={(e) => up({ epicId: e.target.value || undefined, goalId: epics.find((x) => x.id === e.target.value)?.goalId ?? issue.goalId })}>
            <option value="">—</option>
            {epics.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </Prop>
        <Prop label="Strategic goal">
          <select className="select select--bare" value={issue.goalId ?? ''} onChange={(e) => up({ goalId: e.target.value || undefined })}>
            <option value="">— chưa gắn goal</option>
            {settings.goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </Prop>
        <Prop label="Story point">
          <span className="row">
            <select className="select select--bare" value={issue.storyPoints ?? ''} onChange={(e) => up({ storyPoints: e.target.value ? Number(e.target.value) : undefined }, `Estimate → ${e.target.value || '—'} pt`)}>
              <option value="">—</option>
              {FIB.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
            <select className="select select--bare" value={issue.tshirt ?? ''} onChange={(e) => up({ tshirt: (e.target.value || undefined) as TShirt | undefined })}>
              <option value="">Size</option>
              {['S', 'M', 'L', 'XL'].map((s) => <option key={s}>{s}</option>)}
            </select>
          </span>
        </Prop>
        <Prop label="Due date">
          <input className="input input--bare" type="date" value={issue.dueDate ?? ''} onChange={(e) => up({ dueDate: e.target.value || undefined })} />
        </Prop>
        <Prop label="Nguồn">
          <select className="select select--bare" value={issue.source ?? ''} onChange={(e) => up({ source: (e.target.value || undefined) as Source | undefined })}>
            <option value="">—</option>
            {(Object.keys(SOURCES) as Source[]).map((s) => <option key={s} value={s}>{SOURCES[s]}</option>)}
          </select>
        </Prop>
        {issue.type === 'bug' && (
          <Prop label="Severity">
            <select className="select select--bare" value={issue.bugSeverity ?? ''} title={issue.bugSeverity ? SEVERITY[issue.bugSeverity].desc : ''} onChange={(e) => up({ bugSeverity: (e.target.value || undefined) as Issue['bugSeverity'] })}>
              <option value="">—</option>
              {(Object.keys(SEVERITY) as (keyof typeof SEVERITY)[]).map((s) => <option key={s} value={s}>{SEVERITY[s].name}</option>)}
            </select>
          </Prop>
        )}
        <Prop label="Labels">
          <span className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
            {LABELS.map((l) => {
              const on = issue.labelIds.includes(l.id);
              return (
                <button key={l.id} className={`toggle-chip ${on ? 'is-on' : ''}`} onClick={() => up({ labelIds: on ? issue.labelIds.filter((x) => x !== l.id) : [...issue.labelIds, l.id] })}>
                  <span className="chip__dot" style={{ background: l.color }} />{l.name}
                </button>
              );
            })}
          </span>
        </Prop>
      </div>

      <Section title="User story">
        <div className="story">
          <label><span>As a</span><input className="input" value={story.asA} placeholder="loại merchant / user" onChange={(e) => up({ userStory: { ...story, asA: e.target.value } })} /></label>
          <label><span>I want</span><input className="input" value={story.iWant} placeholder="mục tiêu" onChange={(e) => up({ userStory: { ...story, iWant: e.target.value } })} /></label>
          <label><span>So that</span><input className="input" value={story.soThat} placeholder="lý do / giá trị" onChange={(e) => up({ userStory: { ...story, soThat: e.target.value } })} /></label>
        </div>
        <textarea className="textarea" rows={3} style={{ width: '100%', marginTop: 8 }} placeholder="Mô tả, requirement, link design…" value={issue.description} onChange={(e) => up({ description: e.target.value })} />
      </Section>

      <Section title={`Acceptance criteria (${issue.acceptanceCriteria.filter((a) => a.done).length}/${issue.acceptanceCriteria.length})`}>
        {issue.acceptanceCriteria.map((ac) => (
          <div key={ac.id} className="check">
            <input type="checkbox" checked={ac.done} onChange={(e) => up({ acceptanceCriteria: issue.acceptanceCriteria.map((a) => (a.id === ac.id ? { ...a, done: e.target.checked } : a)) })} />
            <span className="grow">{ac.text}</span>
            <button className="icon-btn" onClick={() => up({ acceptanceCriteria: issue.acceptanceCriteria.filter((a) => a.id !== ac.id) })}><IconTrash size={13} /></button>
          </div>
        ))}
        <div className="row">
          <input className="input grow" value={newAc} placeholder="Given … When … Then …  (Enter để thêm)" onChange={(e) => setNewAc(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newAc.trim()) {
                up({ acceptanceCriteria: [...issue.acceptanceCriteria, { id: `ac${Date.now()}`, text: newAc.trim(), done: false }] }, 'Thêm acceptance criterion');
                setNewAc('');
              }
            }} />
        </div>
      </Section>

      <Section title="Why now · Definition of success">
        <textarea className="textarea" rows={2} style={{ width: '100%' }} placeholder="Vì sao item này quan trọng, vì sao là bây giờ? (quote khách, dữ liệu)" value={issue.whyNow} onChange={(e) => up({ whyNow: e.target.value })} />
        <input className="input" style={{ width: '100%', marginTop: 6 }} placeholder="Success metric: mục tiêu nhị phân / metric cần thay đổi / hành vi cần theo dõi" value={issue.successMetric} onChange={(e) => up({ successMetric: e.target.value })} />
      </Section>

      <Section title="Dependencies">
        <div className="muted small" style={{ marginBottom: 4 }}>Bị block bởi</div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
          {issue.blockedBy.map((id) => {
            const b = byId.get(id);
            if (!b) return null;
            const open = blockers.includes(b);
            return (
              <span key={id} className={`dep-chip ${open ? 'is-open' : ''}`}>
                {open && <IconLock size={12} />}<StatusIcon status={b.status} size={12} /> {b.key} <span className="truncate" style={{ maxWidth: 180 }}>{b.title}</span>
                <button onClick={() => up({ blockedBy: issue.blockedBy.filter((x) => x !== id) })}><IconX size={12} /></button>
              </span>
            );
          })}
          <select className="select" value="" onChange={(e) => e.target.value && up({ blockedBy: [...issue.blockedBy, e.target.value] }, 'Thêm dependency')}>
            <option value="">+ Thêm blocker…</option>
            {issues.filter((i) => i.id !== issue.id && !issue.blockedBy.includes(i.id) && !i.archived).map((i) => <option key={i.id} value={i.id}>{i.key} · {i.title}</option>)}
          </select>
        </div>
        {blocks.length > 0 && (
          <>
            <div className="muted small" style={{ margin: '8px 0 4px' }}>Đang block</div>
            <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>{blocks.map((b) => <span key={b.id} className="dep-chip">{b.key} <span className="truncate" style={{ maxWidth: 180 }}>{b.title}</span></span>)}</div>
          </>
        )}
      </Section>

      <Section title={`Definition of Ready · ${r.passed}/${r.total}`} right={<span style={{ width: 120 }}><Progress value={r.pct} color={r.ready ? 'var(--success)' : '#f59e0b'} /></span>}>
        <Checklist items={r.checks} onToggle={(id, v) => up({ dor: { ...issue.dor, [id]: v } })} />
      </Section>

      <Section title={`INVEST · ${invest.filter((c) => c.ok).length}/6`}>
        <Checklist items={invest} onToggle={(id, v) => up({ invest: { ...issue.invest, [id]: v } })} />
      </Section>

      <Section title={`Definition of Done · ${settings.dodItems.filter((d) => issue.dod[d.id]).length}/${settings.dodItems.length}`}>
        <Checklist items={settings.dodItems.map((d) => ({ id: d.id, text: d.text, ok: !!issue.dod[d.id], auto: false }))} onToggle={(id, v) => up({ dod: { ...issue.dod, [id]: v } })} />
      </Section>

      <Section title={`Ưu tiên · ${methodById(settings.activeMethod).name}`} right={<span className="muted small">Đổi method trong Thiết lập</span>}>
        <ScoreEditor issue={issue} method={methodById(settings.activeMethod)} />
      </Section>

      {issue.votes.length > 0 && (
        <Section title="Planning poker">
          {issue.votes.map((v) => (
            <div key={v.memberId} className="row small"><strong style={{ width: 24 }}>{v.points}</strong><span className="muted" style={{ width: 140 }}>{MEMBERS.find((m) => m.id === v.memberId)?.name}</span><span className="grow">{v.reason}</span></div>
          ))}
        </Section>
      )}

      <Section title="Activity">
        {[...issue.activity].reverse().slice(0, 12).map((a, i) => (
          <div key={i} className="row small" style={{ padding: '3px 0' }}>
            <span className="muted" style={{ width: 92, flexShrink: 0 }}>{format(new Date(a.at), 'MMM d, HH:mm')}</span>
            <span>{a.text}</span>
          </div>
        ))}
      </Section>

      <div className="row" style={{ padding: '8px 0 24px' }}>
        <Button
          variant="primary"
          size="sm"
          icon={<IconArrowRight size={14} />}
          title={r.ready ? 'Chuyển thành task trên Bảng (cột PLANNED)' : 'Chưa đạt Definition of Ready'}
          onClick={() => { store.pushToBoard(issue.id); store.openIssue(null); }}
        >
          Đẩy sang Bảng{!r.ready ? ' (chưa Ready)' : ''}
        </Button>
        <Button variant="danger" size="sm" icon={<IconArchive size={14} />} onClick={() => { store.archiveIssue(issue.id); store.openIssue(null); }}>
          Lưu trữ (lỗi thời)
        </Button>
      </div>
    </>
  );
}

export function IssueDrawer() {
  const id = useStore((s) => s.selectedIssueId);
  const issue = useStore((s) => s.issues.find((i) => i.id === id));
  const openIssue = useStore((s) => s.openIssue);
  if (!issue || issue.kind === 'task') return null;
  return (
    <aside className="drawer" key={issue.id}>
      <header className="drawer__head">
        <TypeIcon type={issue.type} />
        <span className="issue-key">{issue.key}</span>
        <span className="grow" />
        <button className="icon-btn" onClick={() => useStore.getState().createIssue({ title: 'Story mới', epicId: issue.epicId, rank: issue.rank + 1 })} title="Tạo story cùng epic"><IconPlus size={16} /></button>
        <button className="icon-btn" onClick={() => openIssue(null)} aria-label="Đóng"><IconX size={16} /></button>
      </header>
      <div className="drawer__body"><DrawerBody issue={issue} /></div>
    </aside>
  );
}
