import { IconAlertTriangle, IconCircleCheck, IconInfoCircle } from '@tabler/icons-react';
import { useStore } from '../../store/useStore';
import { useBacklogIssues, useScoring } from '../../store/hooks';
import { averageVelocity, isStale, points, sprintIssues } from '../../lib/metrics';
import { deep, unresolvedBlockers } from '../../lib/readiness';
import { rankByMethod } from '../../lib/prioritization';
import { SEVERITY } from '../../data/meta';
import { BurndownChart, VelocityChart } from '../../components/charts';
import { Progress } from '../../components/ui/primitives';
import './insights.css';

type Level = 'good' | 'warn' | 'bad';
const LEVEL_COLOR: Record<Level, string> = { good: 'var(--success)', warn: '#f59e0b', bad: 'var(--danger-text)' };

function Kpi({ label, value, sub, level }: { label: string; value: string | number; sub?: string; level?: Level }) {
  return (
    <div className="card kpi">
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

function BarList({ rows }: { rows: { label: string; value: number; color: string; note?: string }[] }) {
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
  const { method, settings, score, ready, byId } = useScoring();
  const now = new Date();
  const active = sprints.find((s) => s.state === 'active');
  const velocity = averageVelocity(sprints, issues);

  // Top ~3 sprint của backlog theo velocity.
  let acc = 0;
  const top = backlog.filter((i) => (acc += i.storyPoints ?? 3) <= (velocity || 30) * 3);
  const topReady = top.filter((i) => ready(i).ready).length;
  const unestimated = backlog.filter((i) => i.storyPoints === undefined);
  const oversized = backlog.filter((i) => (i.storyPoints ?? 0) > 8);
  const blocked = issues.filter((i) => !i.archived && i.status !== 'done' && unresolvedBlockers(i, byId).length);
  const stale = backlog.filter((i) => isStale(i, settings.staleMonths, now));
  const noGoal = backlog.filter((i) => !i.goalId);
  const unscored = backlog.filter((i) => score(i).score === null);
  const ranked = rankByMethod(backlog, method, settings);
  const lowTier = ranked.filter((r) => r.cls && r.cls.order >= 3).length;
  const d = deep(backlog, (i) => score(i).score !== null, now);
  const activeItems = active ? sprintIssues(active, issues) : [];
  const activeCommitted = points(activeItems);

  const signals: { level: Level; text: string }[] = [];
  if (active && activeCommitted > velocity * 1.15) signals.push({ level: 'bad', text: `${active.name} commit ${activeCommitted} pt, vượt velocity TB ${velocity} pt — rủi ro carry-over lớn.` });
  if (activeItems.filter((i) => i.status === 'reviewing').length > 4) signals.push({ level: 'warn', text: `${activeItems.filter((i) => i.status === 'reviewing').length} item kẹt ở REVIEWING — cân nhắc giới hạn WIP (action item retro Sprint 3).` });
  if (top.length && topReady / top.length < 0.6) signals.push({ level: 'warn', text: `Chỉ ${topReady}/${top.length} item top backlog đạt Definition of Ready — cần grooming trước planning.` });
  if (unscored.length) signals.push({ level: 'warn', text: `${unscored.length} item chưa chấm ${method.name} — backlog không thể sắp xếp có căn cứ.` });
  if (noGoal.length / Math.max(1, backlog.length) > 0.3) signals.push({ level: 'warn', text: `${noGoal.length} item không gắn strategic goal — dấu hiệu "dumping ground".` });
  if (lowTier / Math.max(1, ranked.length) > 0.4) signals.push({ level: 'warn', text: `${lowTier} item ở nhóm ưu tiên thấp — chuyển sang Longer-term / Parking lot để backlog gọn.` });
  if (stale.length) signals.push({ level: 'warn', text: `${stale.length} item không được động tới > ${settings.staleMonths} tháng — cân nhắc xoá.` });
  if (!signals.length) signals.push({ level: 'good', text: 'Backlog khoẻ: lean, đã ưu tiên, top đã sẵn sàng.' });

  const byEpic = [...epics.map((e) => ({ label: e.name, value: points(backlog.filter((i) => i.epicId === e.id)), color: e.color })), { label: 'Chưa có epic', value: points(backlog.filter((i) => !i.epicId)), color: '#555' }];
  const byGoal = [...settings.goals.map((g) => ({ label: g.name, value: backlog.filter((i) => i.goalId === g.id).length, color: g.color })), { label: 'Chưa gắn goal', value: noGoal.length, color: '#555' }];
  const bugs = issues.filter((i) => i.type === 'bug' && !i.archived && i.status !== 'done');
  const bySev = (Object.keys(SEVERITY) as (keyof typeof SEVERITY)[]).map((k) => ({ label: SEVERITY[k].name, value: bugs.filter((b) => b.bugSeverity === k).length, color: SEVERITY[k].color }));

  return (
    <div className="view-scroll insights">
      <div className="kpi-row">
        <Kpi label="Velocity TB (3 sprint)" value={`${velocity} pt`} sub={active ? `${active.name}: ${activeCommitted} pt commit` : undefined} level={active && activeCommitted > velocity * 1.15 ? 'bad' : 'good'} />
        <Kpi label="Backlog" value={`${backlog.length} item`} sub={`${points(backlog)} pt ≈ ${velocity ? (points(backlog) / velocity).toFixed(1) : '–'} sprint`} />
        <Kpi label="Top 3 sprint đạt DoR" value={`${topReady}/${top.length}`} sub={`${Math.round((topReady / Math.max(1, top.length)) * 100)}%`} level={topReady / Math.max(1, top.length) >= 0.6 ? 'good' : 'warn'} />
        <Kpi label="Chưa estimate" value={unestimated.length} sub={oversized.length ? `${oversized.length} item > 8 pt cần tách` : 'Không có item quá lớn'} level={oversized.length ? 'warn' : 'good'} />
        <Kpi label="Bị block" value={blocked.length} sub="dependency chưa xong" level={blocked.length ? 'warn' : 'good'} />
        <Kpi label="DEEP" value={`${Math.round(d.overall * 100)}%`} sub="Detailed · Estimated · Emergent · Prioritized" />
      </div>

      <div className="ins-grid">
        <div className="card">
          <div className="card__head">Velocity <span className="muted small">— committed vs completed mỗi sprint</span></div>
          <div className="card__body"><VelocityChart sprints={sprints} issues={issues} /></div>
        </div>
        <div className="card">
          <div className="card__head">Burndown {active ? `· ${active.name}` : ''}</div>
          <div className="card__body">{active ? <BurndownChart sprint={active} issues={activeItems} /> : <div className="muted">Không có sprint đang chạy.</div>}</div>
        </div>

        <div className="card">
          <div className="card__head">Backlog health signals</div>
          <div className="card__body">
            {signals.map((s, i) => (
              <div key={i} className="signal" style={{ borderLeftColor: LEVEL_COLOR[s.level] }}>
                {s.level === 'good' ? <IconCircleCheck size={15} color={LEVEL_COLOR.good} /> : <IconAlertTriangle size={15} color={LEVEL_COLOR[s.level]} />}
                <span>{s.text}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card__head">DEEP <span className="muted small">— backlog tốt phải Detailed appropriately, Estimated, Emergent, Prioritized</span></div>
          <div className="card__body">
            {d.parts.map((p) => (
              <div key={p.key} className="deep-row">
                <div className="row"><strong className="grow">{p.name}</strong><span>{Math.round(p.value * 100)}%</span></div>
                <Progress value={p.value * 100} color={p.value >= 0.7 ? 'var(--success)' : p.value >= 0.4 ? '#f59e0b' : 'var(--danger)'} height={6} />
                <div className="muted small">{p.hint}</div>
              </div>
            ))}
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
              .concat(unscored.length ? [{ label: 'Chưa chấm', value: unscored.length, color: '#555' }] : [])} />
          </div>
        </div>
      </div>
    </div>
  );
}
