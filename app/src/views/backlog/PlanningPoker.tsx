// Planning poker: mỗi người chọn lá + lý do, lật bài, PM chốt majority/average (Product Backlog Grooming p.14).
import { useState } from 'react';
import type { EstimateVote, Issue } from '../../data/types';
import { useStore } from '../../store/useStore';
import { Avatar, Button, memberById } from '../../components/ui/primitives';

const DECK = [1, 2, 3, 5, 8, 13, 20];

export function PlanningPoker({ issue, attendeeIds, onEstimated }: { issue: Issue; attendeeIds: string[]; onEstimated(points: number, votes: EstimateVote[]): void }) {
  const [votes, setVotes] = useState<Record<string, { points?: number; reason: string }>>({});
  const [revealed, setRevealed] = useState(false);
  const updateIssue = useStore((s) => s.updateIssue);

  const cast = Object.entries(votes).filter(([, v]) => v.points !== undefined) as [string, { points: number; reason: string }][];
  const values = cast.map(([, v]) => v.points);
  const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const freq = new Map<number, number>();
  values.forEach((v) => freq.set(v, (freq.get(v) ?? 0) + 1));
  const majority = [...freq.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0];
  const nearestCard = DECK.reduce((best, c) => (Math.abs(c - avg) < Math.abs(best - avg) ? c : best), DECK[0]);
  const spread = values.length ? Math.max(...values) / Math.min(...values) : 1;

  const commit = (points: number) => {
    const list: EstimateVote[] = cast.map(([memberId, v]) => ({ memberId, points: v.points, reason: v.reason }));
    updateIssue(issue.id, { storyPoints: points, votes: list }, `Planning poker → ${points} pt`);
    onEstimated(points, list);
    setVotes({});
    setRevealed(false);
  };

  return (
    <div className="poker">
      {attendeeIds.map((id) => {
        const v = votes[id] ?? { reason: '' };
        return (
          <div key={id} className="poker__row">
            <Avatar member={memberById(id)} size={22} />
            <span className="poker__name truncate">{memberById(id)?.name}</span>
            <div className="poker__deck">
              {DECK.map((c) => (
                <button
                  key={c}
                  className={`poker__card ${v.points === c ? 'is-picked' : ''} ${!revealed && v.points !== undefined && v.points !== c ? 'is-hidden' : ''}`}
                  onClick={() => setVotes({ ...votes, [id]: { ...v, points: v.points === c ? undefined : c } })}
                >
                  {revealed || v.points !== c ? c : '✓'}
                </button>
              ))}
            </div>
            <input className="input grow" placeholder="Lý do (vd: cần đổi cả tracker)" value={v.reason} onChange={(e) => setVotes({ ...votes, [id]: { ...v, reason: e.target.value } })} />
          </div>
        );
      })}
      <div className="row" style={{ marginTop: 10 }}>
        <span className="muted small">{cast.length}/{attendeeIds.length} đã vote</span>
        <span className="grow" />
        {!revealed ? (
          <Button size="sm" variant="primary" disabled={cast.length < 2} onClick={() => setRevealed(true)}>Lật bài</Button>
        ) : (
          <>
            <span className="small">Majority <strong>{majority}</strong> · Average <strong>{avg.toFixed(1)}</strong>{spread >= 3 && <span className="poker__spread"> · chênh lệch lớn — để người vote cao/thấp nhất giải thích rồi vote lại</span>}</span>
            <Button size="sm" variant="outline" onClick={() => { setRevealed(false); setVotes({}); }}>Vote lại</Button>
            <Button size="sm" variant="outline" onClick={() => commit(nearestCard)}>Chốt average ≈ {nearestCard}</Button>
            <Button size="sm" variant="primary" onClick={() => commit(majority!)}>Chốt majority {majority} pt</Button>
          </>
        )}
      </div>
    </div>
  );
}
