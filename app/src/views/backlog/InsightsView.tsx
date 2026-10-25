import { IconAlertTriangle, IconCheck, IconCircleCheck, IconInfoCircle } from '@tabler/icons-react';
import { differenceInCalendarDays } from 'date-fns';
import { useStore } from '../../store/useStore';
import { useBacklogIssues, useHealthFilters, useNeedsRefinement, useScoring } from '../../store/hooks';
import { useUi } from '../../store/ui';
import { STALE_MONTHS, averageVelocity, points } from '../../lib/metrics';
import { deep } from '../../lib/readiness';
import { rankByMethod } from '../../lib/prioritization';
import { SEVERITY } from '../../data/meta';
import { Button, Progress } from '../../components/ui/primitives';
import './insights.css';

type Level = 'good' | 'warn' | 'bad';
const LEVEL_COLOR: Record<Level, string> = { good: 'var(--success)', warn: '#f59e0b', bad: 'var(--danger-text)' };

function Kpi({ label, value, sub, level, onClick }: { label: string; value: string | number; sub?: string; level?: Level; onClick?(): void }) {
  return (
    <div className={`card kpi ${onClick ? 'kpi--link' : ''}`} onClick={onClick} title={onClick ? 'Xem các item này trong Danh sách' : undefined}>
      <div className="muted small">{label}</div>
      <strong>{value}</strong>
      {sub && (
        <span className="small row" style={{ gap: 4, color: level ? LEVEL_COLOR[level] : 'var(--text-3)' }}>
          {level === 'good' && <IconCircleCheck size={13} />}{level && level !== 'good' && <IconAlertTriangle size={13} />}{sub}
        </span>
      )}
    </div>
  );
}

export function BarList({ rows }: { rows: { label: string; value: number; color: string; note?: string }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="barlist">
      {rows.map((r) => (
        <div key={r.label} className="barlist__row">
          <span className="truncate small">{r.label}</span>
          <span className="barlist__track"><span style={{ width: `${(r.value / max) * 100}%`, background: r.color }} /></span>
          <span className="small barlist__val">{r.value}{r.note ? ` ${r.note}` : ''}</span>
        </div>
      ))}
    </div>
  );
}

export function InsightsView() {
  const issues = useStore((s) => s.issues);
  const sprints = useStore((s) => s.sprints);
  const epics = useStore((s) => s.epics);
  const backlog = useBacklogIssues();
  const { method, settings, score } = useScoring();
  const now = new Date();
  const velocity = averageVelocity(sprints, issues);

  const { top } = useNeedsRefinement();
  const filters = useHealthFilters();
  const setHealthFilter = useUi((u) => u.setHealthFilter);
  const updateSettings = useStore((s) => s.updateSettings);
  const count = (id: string) => backlog.filter(filters[id].test).length;
  const show = (id: string) => { setHealthFilter(id); window.location.hash = '/backlog/list'; };
  const topReady = top.length - count('not-ready-top');
  const unscored = count('unscored');
  const noGoal = count('no-goal');
  const noWhy = count('no-why');
  const lowTier = count('low-tier');
  const ranked = rankByMethod(backlog, method, settings);
  const d = deep(backlog, (i) => score(i).score !== null, now);
  const reviewedDays = settings.lastBacklogReviewAt ? differenceInCalendarDays(now, new Date(settings.lastBacklogReviewAt)) : null;

  const signals: { level: Level; text: string; filter?: string; n?: number }[] = [];
  if (top.length && topReady / top.length < 0.6) signals.push({ level: 'warn', text: `Chỉ ${topReady}/${top.length} item top backlog đạt Definition of Ready — cần refinement trước planning.`, filter: 'not-ready-top', n: top.length - topReady });
  if (unscored) signals.push({ level: 'warn', text: `${unscored} item chưa chấm ${method.name} — backlog không thể sắp xếp có căn cứ.`, filter: 'unscored', n: unscored });
  if (noGoal / Math.max(1, backlog.length) > 0.3) signals.push({ level: 'warn', text: `${noGoal} item không gắn strategic goal — dấu hiệu "dumping ground".`, filter: 'no-goal', n: noGoal });
  if (noWhy / Math.max(1, backlog.length) > 0.5) signals.push({ level: 'warn', text: `${noWhy} item thiếu "why now" — khó giải thích vì sao nằm trong backlog.`, filter: 'no-why', n: noWhy });
  if (lowTier / Math.max(1, backlog.length) > 0.4) signals.push({ level: 'warn', text: `${lowTier} item ở nhóm ưu tiên thấp — cân nhắc lưu trữ để backlog gọn.`, filter: 'low-tier', n: lowTier });
  if (count('stale')) signals.push({ level: 'warn', text: `${count('stale')} item không được động tới > ${STALE_MONTHS} tháng — cân nhắc lưu trữ.`, filter: 'stale', n: count('stale') });
  if (!signals.length) signals.push({ level: 'good', text: 'Backlog khoẻ: lean, đã ưu tiên, top đã sẵn sàng.' });

  const byEpic = [...epics.map((e) => ({ label: e.name, value: points(backlog.filter((i) => i.epicId === e.id)), color: e.color })), { label: 'Chưa có epic', value: points(backlog.filter((i) => !i.epicId)), color: '#555' }];
  const byGoal = [...settings.goals.map((g) => ({ label: g.name, value: backlog.filter((i) => i.goalId === g.id).length, color: g.color })), { label: 'Chưa gắn goal', value: noGoal, color: '#555' }];
  const bugs = issues.filter((i) => i.type === 'bug' && !i.archived && i.status !== 'done');
  const bySev = (Object.keys(SEVERITY) as (keyof typeof SEVERITY)[]).map((k) => ({ label: SEVERITY[k].name, value: bugs.filter((b) => b.bugSeverity === k).length, color: SEVERITY[k].color }));

  return (
    <div className="view-scroll insights">
      <div className="kpi-row">
        <Kpi label="Backlog" value={`${backlog.length} item`} sub={`${points(backlog)} pt ≈ ${velocity ? (points(backlog) / velocity).toFixed(1) : '–'} sprint (velocity ${velocity} pt)`} />
        <Kpi label="Top 3 sprint đạt DoR" value={`${topReady}/${top.length}`} sub={`${Math.round((topReady / Math.max(1, top.length)) * 100)}%`} level={topReady / Math.max(1, top.length) >= 0.6 ? 'good' : 'warn'} onClick={() => show('not-ready-top')} />
        <Kpi label="Chưa estimate" value={count('unestimated')} sub={count('oversized') ? `${count('oversized')} item > 8 pt cần tách` : 'Không có item quá lớn'} level={count('oversized') ? 'warn' : 'good'} onClick={() => show(count('unestimated') ? 'unestimated' : 'oversized')} />
        <Kpi label="Bị block" value={count('blocked')} sub="dependency chưa xong" level={count('blocked') ? 'warn' : 'good'} onClick={() => show('blocked')} />
      </div>

      <div className="ins-grid">
        <div className="card ins-wide">
          <div className="card__head">
            Backlog health
            <span className="grow" />
            <span className={`small ${reviewedDays !== null && reviewedDays <= 7 ? 'muted' : 'review-due'}`}>Review lần cuối: {reviewedDays === null ? 'chưa có' : reviewedDays === 0 ? 'hôm nay' : `${reviewedDays} ngày trước`}</span>
            <Button size="sm" variant="ghost" icon={<IconCheck size={13} />} onClick={() => updateSettings({ lastBacklogReviewAt: new Date().toISOString() })}>Đánh dấu đã review</Button>
            <span className="health__sep" />
            <span className="muted small">DEEP</span>
            <strong style={{ color: d.overall >= 0.7 ? 'var(--success)' : d.overall >= 0.4 ? '#f59e0b' : 'var(--danger-text)' }}>{Math.round(d.overall * 100)}%</strong>
          </div>
          <div className="card__body health">
            <div>
              {signals.map((s, i) => (
                <div key={i} className="signal" style={{ borderLeftColor: LEVEL_COLOR[s.level] }}>
                  {s.level === 'good' ? <IconCircleCheck size={15} color={LEVEL_COLOR.good} /> : <IconAlertTriangle size={15} color={LEVEL_COLOR[s.level]} />}
                  <span className="grow">{s.text}</span>
                  {s.filter && <button className="link-btn small nowrap" onClick={() => show(s.filter!)}>Xem {s.n} item →</button>}
                </div>
              ))}
            </div>
            <div>
              {d.parts.map((p) => (
                <div key={p.key} className="deep-row">
                  <div className="row"><strong className="grow">{p.name}</strong><span>{Math.round(p.value * 100)}%</span></div>
                  <Progress value={p.value * 100} color={p.value >= 0.7 ? 'var(--success)' : p.value >= 0.4 ? '#f59e0b' : 'var(--danger)'} height={6} />
                  <div className="muted small">{p.hint}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__head">Story point theo epic</div>
          <div className="card__body"><BarList rows={byEpic.map((r) => ({ ...r, note: 'pt' }))} /></div>
        </div>
        <div className="card">
          <div className="card__head">Item theo strategic goal</div>
          <div className="card__body"><BarList rows={byGoal} /></div>
        </div>
        <div className="card">
          <div className="card__head">Bug đang mở theo severity</div>
          <div className="card__body">
            <BarList rows={bySev} />
            <div className="muted small row" style={{ marginTop: 8, gap: 4 }}><IconInfoCircle size={13} /> Critical sửa ngay, không chờ backlog; Less critical có thể không sửa.</div>
          </div>
        </div>
        <div className="card">
          <div className="card__head">Phân bổ theo {method.name}</div>
          <div className="card__body">
            <BarList rows={[...new Map(ranked.filter((r) => r.cls).map((r) => [r.cls!.label, r.cls!])).values()]
              .sort((a, b) => a.order - b.order)
              .map((c) => ({ label: c.label, value: ranked.filter((r) => r.cls?.label === c.label).length, color: c.color }))
              .concat(unscored ? [{ label: 'Chưa chấm', value: unscored, color: '#555' }] : [])} />
          </div>
        </div>
      </div>
    </div>
  );
}
