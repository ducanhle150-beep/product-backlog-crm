import { useMemo, useState } from 'react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { IconAlertTriangle, IconArrowsSort, IconBook2, IconInfoCircle, IconScale } from '@tabler/icons-react';
import type { Issue } from '../../data/types';
import { useStore } from '../../store/useStore';
import { useBacklogIssues } from '../../store/hooks';
import { useIssueFilter } from '../../store/ui';
import { formatScore, methodById, rankByMethod } from '../../lib/prioritization';
import type { PrioritizationMethod, ScoredIssue } from '../../lib/prioritization';
import { computeCaf, PHASE_MEANING } from '../../lib/prioritization/saeIceCaf';
import { KANO, MOSCOW, analyzeMoscowVotes } from '../../lib/prioritization/categorical';
import type { KanoCategory, MoscowBucket } from '../../lib/prioritization/categorical';
import { points } from '../../lib/metrics';
import { PriorityIcon, TypeIcon } from '../../components/ui/icons';
import { Button, Modal } from '../../components/ui/primitives';
import { FieldInput } from '../../components/issue/ScoreEditor';
import { PairwiseDialog } from './PairwiseDialog';
import './prioritize.css';

const ANTI_PATTERNS = [
  { name: 'Highest Paid Person in the Room', text: 'Ý kiến người có chức cao nhất thắng, bất kể dữ liệu.' },
  { name: 'Squeaky Wheel', text: 'Ai phàn nàn to nhất được ưu tiên.' },
  { name: 'Hot Potato', text: 'Chủ đề "nóng" của tuần/ngày/giờ chen lên đầu.' },
];

function PhasePanel({ rows }: { rows: ScoredIssue[] }) {
  const settings = useStore((s) => s.settings);
  const { p1, p2, p3 } = settings.phaseThresholds;
  const phases = [1, 2, 3, 4].map((o) => ({ o, items: rows.filter((r) => r.cls?.order === o).map((r) => r.issue) }));
  const ranges: Record<number, string> = { 1: `> ${p1}`, 2: `${p2}–${p1}`, 3: `${p3}–<${p2}`, 4: `< ${p3}` };
  const colors = ['#22c55e', '#3b82f6', '#f59e0b', '#8a8a8a'];
  return (
    <div className="viz-phases">
      {phases.map(({ o, items }) => (
        <div key={o} className="phase-card" style={{ borderTopColor: colors[o - 1] }}>
          <div className="row"><strong>Phase {o}</strong><span className="grow" /><strong>{items.length}</strong></div>
          <div className="small" style={{ color: colors[o - 1] }}>Điểm {ranges[o]}</div>
          <div className="muted small">{PHASE_MEANING[o]}</div>
          <div className="muted small" style={{ marginTop: 4 }}>{points(items)} pt</div>
        </div>
      ))}
    </div>
  );
}

function MatrixPanel({ rows, method }: { rows: ScoredIssue[]; method: PrioritizationMethod }) {
  const openIssue = useStore((s) => s.openIssue);
  const isRV = method.id === 'risk-value';
  const xKey = isRV ? 'value' : 'effort', yKey = isRV ? 'risk' : 'value';
  const W = 360, H = 260, pad = 28;
  const sx = (v: number) => pad + ((v - 0.5) / 10) * (W - pad * 2);
  const sy = (v: number) => H - pad - ((v - 0.5) / 10) * (H - pad * 2);
  const quadrants = isRV
    ? [{ x: 1, y: 0, t: '1 · High risk / High value', c: '#22c55e' }, { x: 1, y: 1, t: '2 · Low risk / High value', c: '#86efac' }, { x: 0, y: 1, t: '3 · Low risk / Low value', c: '#f59e0b' }, { x: 0, y: 0, t: '? · High risk / Low value', c: '#ef4444' }]
    : [{ x: 0, y: 0, t: 'Quick wins', c: '#22c55e' }, { x: 1, y: 0, t: 'Big bets', c: '#3b82f6' }, { x: 0, y: 1, t: 'Fill-ins', c: '#f59e0b' }, { x: 1, y: 1, t: 'Time sinks', c: '#ef4444' }];
  const pts = rows.filter((r) => r.score !== null).map((r) => {
    const inp = r.issue.scores[method.id] as Record<string, number>;
    return { r, x: inp[xKey], y: inp[yKey] };
  });
  const midX = sx(5.5), midY = sy(5.5);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="matrix">
      {quadrants.map((q) => (
        <g key={q.t}>
          <rect x={q.x ? midX : pad} y={q.y ? midY : pad} width={q.x ? W - pad - midX : midX - pad} height={q.y ? H - pad - midY : midY - pad} fill={q.c} opacity={0.07} />
          <text x={(q.x ? midX : pad) + 6} y={(q.y ? midY : pad) + 14} fill={q.c} fontSize="10.5">{q.t}</text>
        </g>
      ))}
      <line x1={midX} y1={pad} x2={midX} y2={H - pad} stroke="#333" />
      <line x1={pad} y1={midY} x2={W - pad} y2={midY} stroke="#333" />
      <text x={W / 2} y={H - 6} fill="#818181" fontSize="11" textAnchor="middle">{isRV ? 'Value →' : 'Effort →'}</text>
      <text x={10} y={H / 2} fill="#818181" fontSize="11" textAnchor="middle" transform={`rotate(-90 10 ${H / 2})`}>{isRV ? 'Risk →' : 'Value →'}</text>
      {pts.map(({ r, x, y }, idx) => (
        <g key={r.issue.id} className="matrix__dot" onClick={() => openIssue(r.issue.id)}>
          <circle cx={sx(x) + ((idx % 3) - 1) * 4} cy={sy(y) + ((idx % 2) - 0.5) * 4} r={5} fill={r.cls?.color} stroke="#171717" />
          <title>{`${r.issue.key} · ${r.issue.title}`}</title>
        </g>
      ))}
    </svg>
  );
}

function VotesPanel({ rows }: { rows: ScoredIssue[] }) {
  const settings = useStore((s) => s.settings);
  const issues = useStore((s) => s.issues);
  const { ties, flatVoters } = analyzeMoscowVotes(rows.map((r) => ({ id: r.issue.id, inputs: r.issue.scores['moscow'] })), settings);
  const byBucket = (Object.keys(MOSCOW) as MoscowBucket[]).map((b) => ({ b, n: rows.filter((r) => r.cls?.label === MOSCOW[b].label).length }));
  return (
    <div>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap' }}>
        {byBucket.map(({ b, n }) => (
          <span key={b} className="moscow-pill" style={{ color: MOSCOW[b].color, borderColor: MOSCOW[b].color }}>{MOSCOW[b].label} · {n}</span>
        ))}
      </div>
      <div className="muted small" style={{ marginTop: 8 }}>MVP = Must (+ Should). Điểm vote: M={settings.moscowPoints.M} · S={settings.moscowPoints.S} · C={settings.moscowPoints.C} · W={settings.moscowPoints.W}</div>
      {ties.map((t) => (
        <div key={t.total} className="warn"><IconAlertTriangle size={14} /> Hoà {t.total} điểm: {t.ids.map((id) => issues.find((i) => i.id === id)?.key).join(', ')} — cần thảo luận để tách.</div>
      ))}
      {flatVoters.map((v) => (
        <div key={v} className="warn"><IconAlertTriangle size={14} /> {settings.stakeholders.find((s) => s.id === v)?.name} vote mọi item như nhau — không giúp phân biệt ưu tiên.</div>
      ))}
    </div>
  );
}

function KanoPanel({ rows }: { rows: ScoredIssue[] }) {
  const cats: KanoCategory[] = ['must', 'performance', 'attractive', 'indifferent', 'reverse'];
  return (
    <div className="viz-phases">
      {cats.map((c) => (
        <div key={c} className="phase-card" style={{ borderTopColor: KANO[c].color }}>
          <div className="row"><strong>{KANO[c].label}</strong><span className="grow" /><strong>{rows.filter((r) => r.cls?.label === KANO[c].label).length}</strong></div>
          <div className="muted small">{KANO[c].desc}</div>
        </div>
      ))}
    </div>
  );
}

function BarPanel({ rows, method }: { rows: ScoredIssue[]; method: PrioritizationMethod }) {
  const data = rows.filter((r) => r.score !== null).slice(0, 10).map((r) => ({ key: r.issue.key.replace('FRAUD_', ''), score: Math.round(r.score! * 100) / 100, title: r.issue.title }));
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
        <XAxis type="number" stroke="#666" fontSize={11} />
        <YAxis type="category" dataKey="key" stroke="#666" fontSize={11} width={52} />
        <Tooltip contentStyle={{ background: '#222', border: '1px solid #333', fontSize: 12 }} formatter={(v) => [v, method.name]} labelFormatter={(_, p) => p?.[0]?.payload?.title ?? ''} />
        <Bar dataKey="score" radius={[0, 3, 3, 0]}>
          {data.map((d, i) => <Cell key={d.key} fill={i < 3 ? '#3b6ef5' : '#3a4a6e'} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function RankPanel({ rows, onStart }: { rows: ScoredIssue[]; onStart(): void }) {
  const ranked = rows.filter((r) => r.score !== null);
  return (
    <div className="pair-board">
      <div><div className="section-title">To be prioritized</div><div className="muted">{rows.length - ranked.length} item</div></div>
      <div><div className="section-title">In comparison</div><Button size="sm" variant="primary" onClick={onStart}>Bắt đầu so sánh A vs B</Button></div>
      <div><div className="section-title">Prioritized</div><div className="muted">{ranked.length} item đã xếp hạng</div></div>
    </div>
  );
}

function VotesCells({ issue }: { issue: Issue }) {
  const settings = useStore((s) => s.settings);
  const setScore = useStore((s) => s.setScore);
  const inputs = (issue.scores['moscow'] ?? {}) as Record<string, unknown>;
  const votes = (inputs.votes ?? {}) as Record<string, MoscowBucket>;
  return (
    <>
      {settings.stakeholders.map((sh) => (
        <td key={sh.id}>
          <select
            className="select select--cell"
            value={votes[sh.id] ?? ''}
            style={{ color: votes[sh.id] ? MOSCOW[votes[sh.id]].color : undefined }}
            onChange={(e) => {
              const next = { ...votes };
              if (e.target.value) next[sh.id] = e.target.value as MoscowBucket; else delete next[sh.id];
              setScore(issue.id, 'moscow', { ...inputs, votes: next });
            }}
          >
            <option value="">·</option>
            {(Object.keys(MOSCOW) as MoscowBucket[]).map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </td>
      ))}
    </>
  );
}

export function PrioritizationView() {
  const settings = useStore((s) => s.settings);
  const issues = useStore((s) => s.issues);
  const setScore = useStore((s) => s.setScore);
  const updateIssue = useStore((s) => s.updateIssue);
  const reorder = useStore((s) => s.reorder);
  const openIssue = useStore((s) => s.openIssue);
  const backlog = useBacklogIssues();
  const filter = useIssueFilter();
  const method = methodById(settings.activeMethod);
  const [scope, setScope] = useState<'backlog' | 'open'>('backlog');
  const [focusCol, setFocusCol] = useState<string>('');
  const [confirm, setConfirm] = useState(false);
  const [pairwise, setPairwise] = useState(false);

  const scopeIssues = useMemo(
    () => (scope === 'backlog' ? backlog : issues.filter((i) => i.kind === 'backlog' && !i.archived).sort((a, b) => a.rank - b.rank)).filter(filter),
    [scope, backlog, issues, filter],
  );
  const rows = useMemo(() => rankByMethod(scopeIssues, method, settings), [scopeIssues, method, settings]);
  const scored = rows.filter((r) => r.score !== null).length;
  const fields = method.id === 'wsjf' && focusCol ? method.fields.filter((f) => f.key === focusCol) : method.fields;
  const moved = rows.filter((r, idx) => scopeIssues[idx]?.id !== r.issue.id).length;

  const apply = () => {
    reorder(rows.map((r) => r.issue.id));
    rows.forEach((r) => r.score !== null && updateIssue(r.issue.id, {}, `Sắp xếp lại theo ${method.name}`));
    setConfirm(false);
  };

  return (
    <div className="view-scroll prio">
      <div className="method-current">
        <span className="muted small">Method đang dùng</span>
        <span className="method-tab is-active">{method.short}{method.id === 'sae-ice-caf' && <span className="method-tab__tag">Team</span>}</span>
        <button className="link-btn small" onClick={() => { window.location.hash = '/backlog/settings'; }}>Đổi method trong Thiết lập →</button>
      </div>

      <div className="prio-top">
        <div className="card prio-about">
          <div className="card__head"><IconScale size={16} /> {method.name}</div>
          <div className="card__body">
            <p style={{ marginTop: 0 }}>{method.description}</p>
            <div className="formula">{method.formula}</div>
            <div className="muted small row" style={{ marginTop: 8 }}><IconBook2 size={14} /> {method.source}</div>
            {method.id === 'wsjf' && (
              <div className="small" style={{ marginTop: 10 }}>
                <strong>Do:</strong> tăng trọng số cho uncertainty · chấm từng cột một · team cùng ước lượng Job Size · retro lại thứ hạng sau khi giao.<br />
                <strong>Don't:</strong> dùng số liệu thực tế (số story, tổng point) làm Job Size · nghĩ Job Size theo thời gian · cứng nhắc không chia nhỏ feature.
              </div>
            )}
          </div>
        </div>
        <div className="card prio-viz">
          <div className="card__head">
            {method.visual === 'phase' ? 'Phân bổ theo Implementation Phase' : method.visual === 'matrix' ? 'Ma trận 2×2' : method.visual === 'votes' ? 'Kết quả MoSCoW' : method.visual === 'kano' ? 'Kano categories' : method.visual === 'rank' ? '20/20 board' : 'Top 10 theo điểm'}
            <span className="grow" /><span className="muted small">{scored}/{rows.length} đã chấm</span>
          </div>
          <div className="card__body">
            {method.visual === 'phase' && <PhasePanel rows={rows} />}
            {method.visual === 'matrix' && <MatrixPanel rows={rows} method={method} />}
            {method.visual === 'votes' && <VotesPanel rows={rows} />}
            {method.visual === 'kano' && <KanoPanel rows={rows} />}
            {method.visual === 'bar' && <BarPanel rows={rows} method={method} />}
            {method.visual === 'rank' && <RankPanel rows={rows} onStart={() => setPairwise(true)} />}
          </div>
        </div>
      </div>

      <div className="prio-bar">
        <div className="seg seg--sm">
          <button className={scope === 'backlog' ? 'is-active' : ''} onClick={() => setScope('backlog')}>Backlog ({backlog.length})</button>
          <button className={scope === 'open' ? 'is-active' : ''} onClick={() => setScope('open')}>Gồm cả sprint planned</button>
        </div>
        {method.id === 'wsjf' && (
          <select className="select" value={focusCol} onChange={(e) => setFocusCol(e.target.value)} title="Slide 11: chấm từng category một">
            <option value="">Hiện mọi cột</option>
            {method.fields.map((f) => <option key={f.key} value={f.key}>Chỉ chấm: {f.label}</option>)}
          </select>
        )}
        <span className="grow" />
        <span className="muted small"><IconInfoCircle size={13} style={{ verticalAlign: -2 }} /> Bảng đã sắp theo điểm. Thứ tự backlog chỉ đổi khi bấm Áp dụng.</span>
        <Button variant="primary" size="sm" icon={<IconArrowsSort size={14} />} disabled={scope !== 'backlog' || moved === 0} onClick={() => setConfirm(true)}>
          Áp dụng thứ tự vào backlog
        </Button>
      </div>

      <div className="grid-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th style={{ minWidth: 300 }}>Item</th>
              {method.special === 'votes' && settings.stakeholders.map((s) => <th key={s.id} className="th-center">{s.name}</th>)}
              {fields.map((f) => <th key={f.key} title={f.hint}>{f.label}</th>)}
              {method.special === 'competitors' && <th title="Competitor Adoption Factor">CAF</th>}
              <th>Điểm</th>
              <th>Phân loại</th>
              <th style={{ minWidth: 200 }}>Score reasoning</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const inputs = (r.issue.scores[method.id] ?? {}) as Record<string, unknown>;
              return (
                <tr key={r.issue.id}>
                  <td className="muted">{r.score === null ? '–' : idx + 1}</td>
                  <td>
                    <button className="grid__item" onClick={() => openIssue(r.issue.id)}>
                      <PriorityIcon priority={r.issue.priority} />
                      <TypeIcon type={r.issue.type} />
                      <span className="issue-key">{r.issue.key}</span>
                      <span className="truncate">{r.issue.title}</span>
                    </button>
                  </td>
                  {method.special === 'votes' && <VotesCells issue={r.issue} />}
                  {fields.map((f) => (
                    <td key={f.key}>
                      <FieldInput field={{ ...f, width: f.width ?? (f.kind === 'select' ? undefined : 70) }} value={inputs[f.key]} onChange={(v) => setScore(r.issue.id, method.id, { ...inputs, [f.key]: v })} />
                    </td>
                  ))}
                  {method.special === 'competitors' && (
                    <td>
                      <button className="link-btn small" onClick={() => openIssue(r.issue.id)} title="Sửa adoption trong panel chi tiết">
                        {computeCaf(inputs, settings).toFixed(2)}
                      </button>
                    </td>
                  )}
                  <td className="grid__score">{r.score === null ? <span className="muted">—</span> : formatScore(method, r.score) || '✓'}</td>
                  <td>{r.cls && <span className="cls" style={{ color: r.cls.color, borderColor: r.cls.color }}>{r.cls.label}</span>}</td>
                  <td>
                    <input className="input input--bare" style={{ width: '100%' }} placeholder="Vì sao?" value={r.issue.scoreReasoning} onChange={(e) => updateIssue(r.issue.id, { scoreReasoning: e.target.value })} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card__head"><IconAlertTriangle size={16} color="#f59e0b" /> Tránh anti-pattern khi ưu tiên</div>
        <div className="card__body anti">
          {ANTI_PATTERNS.map((a) => <div key={a.name}><strong>{a.name}</strong><div className="muted small">{a.text}</div></div>)}
          <div><strong>Đừng quên technical item</strong><div className="muted small">PO phải ưu tiên cả technical story, spike, tech debt cùng feature.</div></div>
        </div>
      </div>

      {confirm && (
        <Modal title={`Áp dụng thứ tự ${method.name}`} onClose={() => setConfirm(false)} footer={<><Button variant="ghost" onClick={() => setConfirm(false)}>Huỷ</Button><Button variant="primary" onClick={apply}>Áp dụng</Button></>}>
          <p style={{ marginTop: 0 }}>{moved} item sẽ đổi vị trí trong backlog. Item chưa chấm điểm ({rows.length - scored}) xuống cuối, giữ thứ tự cũ.</p>
          <ol className="small" style={{ paddingLeft: 18, margin: 0 }}>
            {rows.slice(0, 8).map((r) => <li key={r.issue.id}>{r.issue.key} · {r.issue.title}</li>)}
          </ol>
        </Modal>
      )}
      {pairwise && <PairwiseDialog issues={scopeIssues} onClose={() => setPairwise(false)} />}
    </div>
  );
}
