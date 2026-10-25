// Refinement: duyệt lần lượt item top backlog chưa đạt Definition of Ready (một chế độ xem trong Danh sách, không phải session riêng).
import { useState } from 'react';
import { IconArchive, IconArrowBarToUp, IconCheck, IconChevronLeft, IconChevronRight, IconScissors, IconTrash } from '@tabler/icons-react';
import type { Issue } from '../../data/types';
import { useStore } from '../../store/useStore';
import { useBacklogIssues, useNeedsRefinement, useScoring } from '../../store/hooks';
import { StatusIcon, TypeIcon } from '../../components/ui/icons';
import { Badge, Button, Modal, Progress } from '../../components/ui/primitives';
import { ReadyDot, ScoreBadge } from './BacklogRow';
import './refine.css';

const FIB = [1, 2, 3, 5, 8, 13, 20];

function SplitDialog({ issue, onClose }: { issue: Issue; onClose(): void }) {
  const [text, setText] = useState('');
  const [toEpic, setToEpic] = useState(false);
  const titles = text.split('\n').map((t) => t.trim()).filter(Boolean);
  const splitIssue = useStore((s) => s.splitIssue);
  return (
    <Modal title={`Tách ${issue.key}`} onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Huỷ</Button><Button variant="primary" disabled={!titles.length} onClick={() => { splitIssue(issue.id, titles, toEpic); onClose(); }}>Tách {titles.length} story</Button></>}>
      <p className="muted" style={{ marginTop: 0 }}>Mỗi dòng là một story con, sắp theo giá trị cho khách hàng (story giá trị nhất lên đầu).</p>
      <textarea className="textarea" rows={6} style={{ width: '100%' }} value={text} onChange={(e) => setText(e.target.value)} placeholder={'Tạo rule theo quốc gia\nTạo rule theo IP\n…'} />
      <label className="check"><input type="checkbox" checked={toEpic} onChange={(e) => setToEpic(e.target.checked)} /> Story quá lớn → chuyển thành Epic mới (lưu trữ item gốc)</label>
    </Modal>
  );
}

function Editor({ issue, onNext }: { issue: Issue; onNext(): void }) {
  const store = useStore();
  const { ready } = useScoring();
  const [ac, setAc] = useState('');
  const [split, setSplit] = useState(false);
  const r = ready(issue);
  const story = issue.userStory ?? { asA: '', iWant: '', soThat: '' };
  const up = (patch: Partial<Issue>, activity?: string) => store.updateIssue(issue.id, patch, activity);

  return (
    <div className="refine__card">
      <div className="row">
        <TypeIcon type={issue.type} /><span className="issue-key">{issue.key}</span><StatusIcon status={issue.status} />
        <span className="grow" /><ScoreBadge issue={issue} />
        <Badge color={r.ready ? '#4ade80' : '#fbbf24'} bg={r.ready ? 'var(--success-soft)' : '#2e2410'}>DoR {r.passed}/{r.total}</Badge>
        <button className="link-btn small" onClick={() => store.openIssue(issue.id)}>Mở chi tiết</button>
      </div>
      <input className="refine__title" value={issue.title} onChange={(e) => up({ title: e.target.value })} />

      <div className="section-title">User story</div>
      <div className="story">
        <label><span>As a</span><input className="input" value={story.asA} placeholder="loại merchant / user" onChange={(e) => up({ userStory: { ...story, asA: e.target.value } })} /></label>
        <label><span>I want</span><input className="input" value={story.iWant} placeholder="mục tiêu" onChange={(e) => up({ userStory: { ...story, iWant: e.target.value } })} /></label>
        <label><span>So that</span><input className="input" value={story.soThat} placeholder="lý do / giá trị" onChange={(e) => up({ userStory: { ...story, soThat: e.target.value } })} /></label>
      </div>

      <div className="section-title" style={{ marginTop: 14 }}>Acceptance criteria ({issue.acceptanceCriteria.length})</div>
      {issue.acceptanceCriteria.map((a) => (
        <div key={a.id} className="refine__ac">
          <span className="grow">• {a.text}</span>
          <button className="icon-btn" onClick={() => up({ acceptanceCriteria: issue.acceptanceCriteria.filter((x) => x.id !== a.id) })}><IconTrash size={13} /></button>
        </div>
      ))}
      <input className="input" style={{ width: '100%', marginTop: 4 }} placeholder="+ Given … When … Then … (Enter)" value={ac} onChange={(e) => setAc(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && ac.trim()) {
            up({ acceptanceCriteria: [...issue.acceptanceCriteria, { id: `ac${Date.now()}`, text: ac.trim(), done: false }] }, 'Refinement: thêm acceptance criterion');
            setAc('');
          }
        }} />

      <div className="refine__grid">
        <div>
          <div className="section-title">Estimate (story point)</div>
          <div className="refine__points">
            {FIB.map((p) => (
              <button key={p} className={`refine__pt ${issue.storyPoints === p ? 'is-on' : ''}`} onClick={() => up({ storyPoints: p }, `Refinement: estimate ${p} pt`)}>{p}</button>
            ))}
          </div>
          {(issue.storyPoints ?? 0) > 8 && <div className="warn">Lớn hơn 8 pt — nên tách nhỏ trước khi vào sprint.</div>}
        </div>
        <div>
          <div className="section-title">Definition of Ready</div>
          {r.checks.map((c) => (
            <label key={c.id} className={`check ${c.auto ? 'check--auto' : ''}`} title={c.auto ? 'Tự động suy ra từ dữ liệu' : undefined}>
              <input type="checkbox" checked={c.ok} disabled={c.auto} onChange={(e) => up({ dor: { ...issue.dor, [c.id]: e.target.checked } })} />
              <span className="small grow">{c.text}</span>
              {c.auto && <span className="muted small">tự động</span>}
            </label>
          ))}
        </div>
      </div>

      <div className="refine__actions">
        <Button size="sm" variant="primary" icon={<IconCheck size={14} />}
          disabled={r.checks.some((c) => c.auto && !c.ok)}
          title={r.checks.filter((c) => c.auto && !c.ok).map((c) => c.text).join('\n')}
          onClick={() => {
            const manual = Object.fromEntries(r.checks.filter((c) => !c.auto).map((c) => [c.id, true]));
            up({ dor: { ...issue.dor, ...manual }, lastGroomedAt: new Date().toISOString() }, 'Refinement: đạt Definition of Ready');
            onNext();
          }}>
          Ready → item tiếp
        </Button>
        <Button size="sm" icon={<IconScissors size={14} />} onClick={() => setSplit(true)}>Tách story / thành Epic</Button>
        <Button size="sm" icon={<IconArrowBarToUp size={14} />} onClick={() => up({ rank: Math.min(...store.issues.map((i) => i.rank)) - 1000 }, 'Refinement: đưa lên đầu backlog')}>Đưa lên đầu backlog</Button>
        <Button size="sm" variant="danger" icon={<IconArchive size={14} />} onClick={() => { store.archiveIssue(issue.id); onNext(); }}>Lưu trữ (lỗi thời)</Button>
      </div>
      {split && <SplitDialog issue={issue} onClose={() => setSplit(false)} />}
    </div>
  );
}

export { useNeedsRefinement };

export function RefinementView() {
  const { top, notReady, horizon } = useNeedsRefinement();
  const { ready } = useScoring();
  const backlog = useBacklogIssues();
  const [all, setAll] = useState(false);
  const queue = all ? backlog.filter((i) => !ready(i).ready) : notReady;
  const [currentId, setCurrentId] = useState<string | undefined>(queue[0]?.id);
  const idx = Math.max(0, queue.findIndex((i) => i.id === currentId));
  const current = queue.find((i) => i.id === currentId) ?? queue[0];
  const go = (n: number) => setCurrentId(queue[Math.min(Math.max(n, 0), queue.length - 1)]?.id);
  const next = () => {
    const after = queue[idx + 1] ?? queue.find((i) => i.id !== current?.id);
    setCurrentId(after?.id);
  };
  const readyTop = top.length - notReady.length;

  return (
    <div className="refine">
      <aside className="refine__queue">
        <div className="section-title">Cần refine · {queue.length}</div>
        <div className="muted small" style={{ marginBottom: 6 }}>
          {all ? 'Mọi backlog item chưa đạt DoR' : `Top backlog ≈ 3 sprint (${horizon} pt) chưa đạt DoR`}
        </div>
        {!all && <><Progress value={top.length ? (readyTop / top.length) * 100 : 100} color="var(--success)" /><div className="muted small" style={{ margin: '4px 0 8px' }}>{readyTop}/{top.length} item top đã Ready</div></>}
        <label className="row small muted" style={{ gap: 6, marginBottom: 8, cursor: 'pointer' }}>
          <input type="checkbox" checked={all} onChange={(e) => { setAll(e.target.checked); setCurrentId(undefined); }} /> Toàn bộ backlog
        </label>
        {queue.map((i) => (
          <button key={i.id} className={`refine__qitem ${i.id === current?.id ? 'is-active' : ''}`} onClick={() => setCurrentId(i.id)}>
            <ReadyDot pct={ready(i).pct} /><span className="issue-key small">{i.key}</span><span className="truncate small">{i.title}</span>
          </button>
        ))}
      </aside>
      <section className="refine__main">
        {current ? (
          <>
            <div className="row" style={{ marginBottom: 10 }}>
              <span className="muted small">Item {idx + 1}/{queue.length}</span>
              <span className="grow" />
              <Button size="sm" variant="ghost" icon={<IconChevronLeft size={14} />} disabled={idx === 0} onClick={() => go(idx - 1)}>Trước</Button>
              <Button size="sm" variant="ghost" disabled={idx >= queue.length - 1} onClick={() => go(idx + 1)}>Bỏ qua <IconChevronRight size={14} /></Button>
            </div>
            <Editor key={current.id} issue={current} onNext={next} />
          </>
        ) : (
          <div className="empty">
            <div className="empty__title">Không còn item cần refine</div>
            <div className="empty__body">Top backlog đã đạt Definition of Ready — sẵn sàng cho Sprint Planning.</div>
          </div>
        )}
      </section>
    </div>
  );
}
