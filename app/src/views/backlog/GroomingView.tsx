import { useEffect, useMemo, useState } from 'react';
import {
  IconArchive, IconArrowBarToUp, IconCheck, IconChevronLeft, IconChevronRight, IconClock, IconPlayerPlay,
  IconPlayerStop, IconPlus, IconScissors, IconSparkles, IconX,
} from '@tabler/icons-react';
import { format } from 'date-fns';
import type { GroomingLogEntry, GroomingSession, Issue } from '../../data/types';
import { MEMBERS } from '../../data/seed';
import { useStore } from '../../store/useStore';
import { useBacklogIssues, useScoring } from '../../store/hooks';
import { averageVelocity } from '../../lib/metrics';
import { investChecks } from '../../lib/readiness';
import { StatusIcon, TypeIcon } from '../../components/ui/icons';
import { Avatar, Badge, Button, Modal, Progress } from '../../components/ui/primitives';
import { ReadyDot, ScoreBadge } from './BacklogRow';
import { PlanningPoker } from './PlanningPoker';
import './grooming.css';

export const PREP_ITEMS = [
  { id: 'p1', text: 'Gửi trước danh sách story cần grooming cho attendees' },
  { id: 'p2', text: 'Xem lại strategic objectives trên roadmap' },
  { id: 'p3', text: 'Trao đổi với stakeholder nội bộ / khách hàng' },
  { id: 'p4', text: 'Xem key metrics và kết quả experiment' },
  { id: 'p5', text: 'Đã ưu tiên sẵn 2–3 sprint tới (không cần đủ AC)' },
  { id: 'p6', text: 'Trả lời được: theme chính là gì? vì sao top? giá trị so với objective?' },
];

const ACTIVITIES = [
  'Xoá user story không còn liên quan',
  'Tạo story mới cho nhu cầu mới phát hiện',
  'Đánh giá lại độ ưu tiên tương đối',
  'Estimate story chưa có estimate',
  'Sửa estimate khi có thông tin mới',
  'Tách story ưu tiên cao nhưng quá lớn cho sprint tới',
];

const ACTION_LABEL: Record<GroomingLogEntry['action'], string> = {
  added: 'Thêm', removed: 'Xoá', split: 'Tách', estimated: 'Estimate', reprioritized: 'Đổi ưu tiên', ready: 'Ready', rewritten: 'Viết lại', note: 'Ghi chú',
};

const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

function useTicker(running: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);
  return now;
}

/** Item cần grooming: top backlog đủ ~3 sprint (theo velocity) chưa đạt DoR. */
function useNeedsGrooming() {
  const backlog = useBacklogIssues();
  const sprints = useStore((s) => s.sprints);
  const issues = useStore((s) => s.issues);
  const { ready } = useScoring();
  const horizon = (averageVelocity(sprints, issues) || 30) * 3;
  return useMemo(() => {
    let acc = 0;
    const top: Issue[] = [];
    for (const i of backlog) {
      if (acc > horizon) break;
      acc += i.storyPoints ?? 3;
      top.push(i);
    }
    return { top, notReady: top.filter((i) => !ready(i).ready), horizon };
  }, [backlog, horizon, ready]);
}

function SplitDialog({ issue, onDone, onClose }: { issue: Issue; onDone(n: number, toEpic: boolean): void; onClose(): void }) {
  const [text, setText] = useState('');
  const [toEpic, setToEpic] = useState(false);
  const titles = text.split('\n').map((t) => t.trim()).filter(Boolean);
  const splitIssue = useStore((s) => s.splitIssue);
  return (
    <Modal title={`Tách ${issue.key}`} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Huỷ</Button><Button variant="primary" disabled={!titles.length} onClick={() => { splitIssue(issue.id, titles, toEpic); onDone(titles.length, toEpic); }}>Tách {titles.length} story</Button></>}>
      <p className="muted" style={{ marginTop: 0 }}>Mỗi dòng là một story con, sắp theo giá trị cho khách hàng (story giá trị nhất lên đầu).</p>
      <textarea className="textarea" rows={6} style={{ width: '100%' }} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Tìm kiếm free-text\nDuyệt theo thể loại\n…'} />
      <label className="check"><input type="checkbox" checked={toEpic} onChange={(e) => setToEpic(e.target.checked)} /> Story quá lớn → chuyển thành Epic mới (lưu trữ item gốc)</label>
    </Modal>
  );
}

function RunPanel({ session }: { session: GroomingSession }) {
  const store = useStore();
  const { ready, byId } = useScoring();
  const [idx, setIdx] = useState(0);
  const [storyStart, setStoryStart] = useState(() => Date.now());
  const [split, setSplit] = useState(false);
  const now = useTicker(session.status === 'running');
  const agenda = session.agenda.map((id) => byId.get(id)).filter((i): i is Issue => !!i && !i.archived);
  const issue = agenda[Math.min(idx, agenda.length - 1)];
  const startedAt = new Date(session.date).getTime();
  const elapsed = Math.max(0, (now - startedAt) / 1000);
  const storyElapsed = (now - storyStart) / 1000;
  const log = (action: GroomingLogEntry['action'], detail: string, issueId = issue?.id) => store.logSession(session.id, { action, detail, issueId });
  const goto = (n: number) => { setIdx(n); setStoryStart(Date.now()); };

  if (!issue) return <div className="empty">Agenda trống — thêm item từ "Cần grooming".</div>;
  const r = ready(issue);
  const story = issue.userStory ?? { asA: '', iWant: '', soThat: '' };
  const invest = investChecks(issue, byId);

  return (
    <div className="run">
      <div className="run__timers">
        <span className={`timer ${elapsed > session.targetMinutes * 60 ? 'is-over' : ''}`}><IconClock size={15} /> Session {mmss(elapsed)} / {session.targetMinutes}:00</span>
        <span className={`timer ${storyElapsed > session.perStoryMinutes * 60 ? 'is-over' : ''}`}>Story {mmss(storyElapsed)} / {session.perStoryMinutes}:00</span>
        <span className="grow" />
        <Button size="sm" variant="ghost" icon={<IconChevronLeft size={14} />} disabled={idx === 0} onClick={() => goto(idx - 1)}>Trước</Button>
        <span className="muted small">{idx + 1}/{agenda.length}</span>
        <Button size="sm" variant="ghost" disabled={idx >= agenda.length - 1} onClick={() => goto(idx + 1)}>Tiếp <IconChevronRight size={14} /></Button>
      </div>

      <div className="run__card">
        <div className="row">
          <TypeIcon type={issue.type} /><span className="issue-key">{issue.key}</span><StatusIcon status={issue.status} />
          <span className="grow" /><ScoreBadge issue={issue} />
          <Badge color={r.ready ? '#4ade80' : '#fbbf24'} bg={r.ready ? 'var(--success-soft)' : '#2e2410'}>DoR {r.passed}/{r.total}</Badge>
          <button className="link-btn small" onClick={() => store.openIssue(issue.id)}>Mở chi tiết</button>
        </div>
        <input className="run__title" value={issue.title} onChange={(e) => store.updateIssue(issue.id, { title: e.target.value })} onBlur={() => log('rewritten', 'Sửa tiêu đề')} />
        <div className="story">
          <label><span>As a</span><input className="input" value={story.asA} onChange={(e) => store.updateIssue(issue.id, { userStory: { ...story, asA: e.target.value } })} /></label>
          <label><span>I want</span><input className="input" value={story.iWant} onChange={(e) => store.updateIssue(issue.id, { userStory: { ...story, iWant: e.target.value } })} /></label>
          <label><span>So that</span><input className="input" value={story.soThat} onBlur={() => story.iWant && log('rewritten', 'Viết lại user story')} onChange={(e) => store.updateIssue(issue.id, { userStory: { ...story, soThat: e.target.value } })} /></label>
        </div>
        <AcQuick issue={issue} onAdd={() => log('rewritten', 'Thêm acceptance criteria')} />

        <div className="run__grid">
          <div>
            <div className="section-title">Definition of Ready</div>
            {r.checks.map((c) => (
              <label key={c.id} className={`check ${c.auto ? 'check--auto' : ''}`}>
                <input type="checkbox" checked={c.ok} disabled={c.auto} onChange={(e) => store.updateIssue(issue.id, { dor: { ...issue.dor, [c.id]: e.target.checked } })} />
                <span className="small">{c.text}</span>
              </label>
            ))}
          </div>
          <div>
            <div className="section-title">INVEST</div>
            {invest.map((c) => (
              <label key={c.id} className={`check ${c.auto ? 'check--auto' : ''}`}>
                <input type="checkbox" checked={c.ok} disabled={c.auto} onChange={(e) => store.updateIssue(issue.id, { invest: { ...issue.invest, [c.id]: e.target.checked } })} />
                <span className="small">{c.text}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="section-title" style={{ marginTop: 14 }}>Planning poker {issue.storyPoints !== undefined && <span className="muted">· hiện tại {issue.storyPoints} pt</span>}</div>
        <PlanningPoker key={issue.id} issue={issue} attendeeIds={session.attendeeIds} onEstimated={(p, votes) => log('estimated', `Estimate ${p} pt (votes ${votes.map((v) => v.points).join(', ')})`)} />

        <div className="run__actions">
          <Button size="sm" variant="primary" icon={<IconCheck size={14} />} disabled={!r.ready && r.checks.some((c) => c.auto && !c.ok)}
            title={r.checks.filter((c) => !c.ok).map((c) => c.text).join('\n')}
            onClick={() => {
              const manual = Object.fromEntries(r.checks.filter((c) => !c.auto).map((c) => [c.id, true]));
              store.updateIssue(issue.id, { dor: { ...issue.dor, ...manual }, lastGroomedAt: new Date().toISOString() }, 'Grooming: đạt Definition of Ready');
              log('ready', 'Đạt DoR');
              if (idx < agenda.length - 1) goto(idx + 1);
            }}>
            Đánh dấu Ready
          </Button>
          <Button size="sm" icon={<IconScissors size={14} />} onClick={() => setSplit(true)}>Tách story / thành Epic</Button>
          <Button size="sm" icon={<IconArrowBarToUp size={14} />} onClick={() => {
            const min = Math.min(...store.issues.map((i) => i.rank));
            store.updateIssue(issue.id, { rank: min - 1000 }, 'Grooming: đưa lên đầu backlog');
            log('reprioritized', 'Đưa lên đầu backlog');
          }}>Đưa lên đầu backlog</Button>
          <Button size="sm" variant="danger" icon={<IconArchive size={14} />} onClick={() => { store.archiveIssue(issue.id); log('removed', 'Xoá item lỗi thời'); }}>Xoá (lỗi thời)</Button>
        </div>
      </div>
      {split && <SplitDialog issue={issue} onClose={() => setSplit(false)} onDone={(n, toEpic) => { log('split', `Tách thành ${n} story${toEpic ? ' + tạo epic' : ''}`); setSplit(false); }} />}
    </div>
  );
}

function AcQuick({ issue, onAdd }: { issue: Issue; onAdd(): void }) {
  const updateIssue = useStore((s) => s.updateIssue);
  const [text, setText] = useState('');
  return (
    <div style={{ marginTop: 8 }}>
      {issue.acceptanceCriteria.map((a) => <div key={a.id} className="small ac-line">• {a.text}</div>)}
      <input className="input" style={{ width: '100%', marginTop: 4 }} placeholder="+ Acceptance criterion (Given/When/Then) — Enter" value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && text.trim()) {
            updateIssue(issue.id, { acceptanceCriteria: [...issue.acceptanceCriteria, { id: `ac${Date.now()}`, text: text.trim(), done: false }] });
            setText('');
            onAdd();
          }
        }} />
    </div>
  );
}

function SessionDetail({ session }: { session: GroomingSession }) {
  const store = useStore();
  const { byId, ready } = useScoring();
  const { notReady } = useNeedsGrooming();
  const up = (patch: Partial<GroomingSession>) => store.updateSession(session.id, patch);
  const agenda = session.agenda.map((id) => byId.get(id)).filter((i): i is Issue => !!i);
  const counts = session.log.reduce<Record<string, number>>((m, l) => ({ ...m, [l.action]: (m[l.action] ?? 0) + 1 }), {});

  return (
    <div className="gdetail">
      <div className="gdetail__head">
        <input className="gdetail__title" value={session.title} onChange={(e) => up({ title: e.target.value })} />
        <Badge color={session.status === 'running' ? '#4ade80' : session.status === 'done' ? 'var(--text-2)' : 'var(--accent-text)'} bg={session.status === 'running' ? 'var(--success-soft)' : session.status === 'planned' ? 'var(--accent-soft)' : undefined}>
          {session.status === 'running' ? 'Đang chạy' : session.status === 'done' ? 'Đã xong' : 'Planned'}
        </Badge>
        <span className="grow" />
        {session.status === 'planned' && <Button variant="primary" size="sm" icon={<IconPlayerPlay size={14} />} disabled={!agenda.length} onClick={() => up({ status: 'running', date: new Date().toISOString() })}>Bắt đầu session</Button>}
        {session.status === 'running' && <Button variant="outline" size="sm" icon={<IconPlayerStop size={14} />} onClick={() => up({ status: 'done' })}>Kết thúc</Button>}
      </div>

      <div className="gmeta">
        <label className="field"><span>Thời gian</span><input className="input" type="datetime-local" value={format(new Date(session.date), "yyyy-MM-dd'T'HH:mm")} onChange={(e) => up({ date: new Date(e.target.value).toISOString() })} /></label>
        <label className="field"><span>Facilitator</span>
          <select className="select" value={session.facilitatorId} onChange={(e) => up({ facilitatorId: e.target.value })}>{MEMBERS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
        </label>
        <label className="field"><span>Mục tiêu thời lượng</span>
          <span className="row"><input className="input" type="number" style={{ width: 64 }} value={session.targetMinutes} onChange={(e) => up({ targetMinutes: Number(e.target.value) })} /> phút · <input className="input" type="number" style={{ width: 54 }} value={session.perStoryMinutes} onChange={(e) => up({ perStoryMinutes: Number(e.target.value) })} /> phút/story</span>
        </label>
        <label className="field" style={{ gridColumn: '1 / -1' }}><span>Mục tiêu session</span><input className="input" value={session.goal} placeholder="Mọi người rời phòng biết rõ còn gì cần hoàn thành và goal sprint tới" onChange={(e) => up({ goal: e.target.value })} /></label>
        <div className="field" style={{ gridColumn: '1 / -1' }}>
          <span>Attendees ({session.attendeeIds.length}) — nhóm nhỏ: PM, Scrum Master, lead dev, vài stakeholder</span>
          <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
            {MEMBERS.map((m) => {
              const on = session.attendeeIds.includes(m.id);
              return (
                <button key={m.id} className={`toggle-chip ${on ? 'is-on' : ''}`} onClick={() => up({ attendeeIds: on ? session.attendeeIds.filter((x) => x !== m.id) : [...session.attendeeIds, m.id] })}>
                  <Avatar member={m} size={14} />{m.name.replace(/^SAE\.\w - /, '')}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {session.status === 'running' ? (
        <RunPanel session={session} />
      ) : (
        <div className="gcols">
          <div className="card">
            <div className="card__head">Agenda · {agenda.length} item</div>
            <div className="card__body">
              {agenda.map((i) => (
                <div key={i.id} className="agenda-row">
                  <ReadyDot pct={ready(i).pct} />
                  <span className="issue-key">{i.key}</span>
                  <button className="truncate grow" style={{ textAlign: 'left' }} onClick={() => store.openIssue(i.id)}>{i.title}</button>
                  {session.status === 'planned' && <button className="icon-btn" onClick={() => up({ agenda: session.agenda.filter((x) => x !== i.id) })}><IconX size={13} /></button>}
                </div>
              ))}
              {session.status === 'planned' && notReady.filter((i) => !session.agenda.includes(i.id)).length > 0 && (
                <Button size="sm" variant="ghost" icon={<IconPlus size={14} />} style={{ marginTop: 6 }} onClick={() => up({ agenda: [...session.agenda, ...notReady.filter((i) => !session.agenda.includes(i.id)).map((i) => i.id)] })}>
                  Thêm toàn bộ item "Cần grooming"
                </Button>
              )}
            </div>
          </div>
          <div className="card">
            <div className="card__head">{session.status === 'done' ? 'Kết quả session' : 'Chuẩn bị (prep checklist)'}</div>
            <div className="card__body">
              {session.status !== 'done' ? (
                PREP_ITEMS.map((p) => (
                  <label key={p.id} className="check"><input type="checkbox" checked={!!session.prep[p.id]} onChange={(e) => up({ prep: { ...session.prep, [p.id]: e.target.checked } })} /><span className="small">{p.text}</span></label>
                ))
              ) : (
                <>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                    {Object.entries(counts).map(([a, n]) => <Badge key={a}>{ACTION_LABEL[a as GroomingLogEntry['action']]} · {n}</Badge>)}
                  </div>
                  {session.log.map((l, k) => (
                    <div key={k} className="small row" style={{ padding: '3px 0', alignItems: 'flex-start' }}>
                      <span className="muted" style={{ width: 44 }}>{format(new Date(l.at), 'HH:mm')}</span>
                      <span style={{ width: 84 }} className="muted">{l.issueId && byId.get(l.issueId)?.key}</span>
                      <span>{l.detail}</span>
                    </div>
                  ))}
                  <textarea className="textarea" rows={3} style={{ width: '100%', marginTop: 10 }} placeholder="Follow-up gửi team sau session…" value={session.notes} onChange={(e) => up({ notes: e.target.value })} />
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function GroomingView() {
  const sessions = useStore((s) => s.sessions);
  const createSession = useStore((s) => s.createSession);
  const openIssue = useStore((s) => s.openIssue);
  const { ready } = useScoring();
  const { top, notReady, horizon } = useNeedsGrooming();
  const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
  const [selected, setSelected] = useState(() => sorted.find((s) => s.status !== 'done')?.id ?? sorted[0]?.id);
  const session = sessions.find((s) => s.id === selected);

  return (
    <div className="grooming">
      <aside className="glist">
        <Button variant="primary" size="sm" icon={<IconSparkles size={14} />} onClick={() => {
          const s = createSession({ title: 'Grooming session mới', agenda: notReady.slice(0, 6).map((i) => i.id), attendeeIds: ['me', 'huan', 'hai', 'judith', 'erik'] });
          setSelected(s.id);
        }}>Tạo grooming session</Button>
        <div className="section-title" style={{ marginTop: 16 }}>Sessions</div>
        {sorted.map((s) => (
          <button key={s.id} className={`glist__item ${s.id === selected ? 'is-active' : ''}`} onClick={() => setSelected(s.id)}>
            <span className="row"><strong className="truncate grow">{s.title}</strong>{s.status === 'running' && <span className="live-dot" />}</span>
            <span className="muted small">{format(new Date(s.date), 'EEE, MMM d · HH:mm')} · {s.agenda.length} item</span>
          </button>
        ))}

        <div className="section-title" style={{ marginTop: 18 }}>Cần grooming · {notReady.length}/{top.length}</div>
        <div className="muted small" style={{ marginBottom: 6 }}>Top backlog ≈ 3 sprint ({horizon} pt) chưa đạt DoR</div>
        <Progress value={top.length ? ((top.length - notReady.length) / top.length) * 100 : 100} color="var(--success)" />
        <div style={{ marginTop: 8 }}>
          {notReady.map((i) => (
            <button key={i.id} className="need-row" onClick={() => openIssue(i.id)}>
              <ReadyDot pct={ready(i).pct} /><span className="issue-key small">{i.key}</span><span className="truncate small">{i.title}</span>
            </button>
          ))}
        </div>

        <div className="card" style={{ marginTop: 18 }}>
          <div className="card__head small">Hoạt động grooming (Agile Alliance)</div>
          <div className="card__body small">{ACTIVITIES.map((a) => <div key={a} className="muted" style={{ padding: '2px 0' }}>• {a}</div>)}</div>
        </div>
      </aside>
      <section className="gmain">
        {session ? <SessionDetail key={session.id} session={session} /> : <div className="empty">Chưa có session</div>}
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card__head small">Grooming vs Sprint Planning</div>
          <table className="cmp">
            <thead><tr><th /><th>Backlog grooming</th><th>Sprint planning</th></tr></thead>
            <tbody>
              <tr><td>Mục đích</td><td>Giữ backlog khoẻ, cập nhật để sprint planning hiệu quả</td><td>Thống nhất sprint goal và các item để đạt goal</td></tr>
              <tr><td>Nội dung</td><td>Viết lại item rõ hơn, xoá item lỗi thời, tách story lớn</td><td>Ưu tiên item, chốt số item theo capacity</td></tr>
              <tr><td>Khi nào</td><td>Vài ngày trước sprint planning</td><td>Đầu mỗi sprint</td></tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
