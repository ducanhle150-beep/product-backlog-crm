// 20/20 force-rank: insertion sort từ đầu danh sách, mỗi lần so 2 item (slide 5–6).
import { useState } from 'react';
import type { Issue } from '../../data/types';
import { useStore } from '../../store/useStore';
import { TypeIcon } from '../../components/ui/icons';
import { Button, Modal, Progress } from '../../components/ui/primitives';

export function PairwiseDialog({ issues, onClose }: { issues: Issue[]; onClose(): void }) {
  const setScore = useStore((s) => s.setScore);
  const [count, setCount] = useState(Math.min(10, issues.length));
  const [started, setStarted] = useState(false);
  const [queue, setQueue] = useState<Issue[]>([]);
  const [ranked, setRanked] = useState<Issue[]>([]);
  const [j, setJ] = useState(0);
  const [comparisons, setComparisons] = useState(0);

  const start = () => {
    const pool = issues.slice(0, count);
    setRanked(pool.slice(0, 1));
    setQueue(pool.slice(1));
    setJ(0);
    setStarted(true);
  };

  const current = queue[0];
  const done = started && !current;

  const pick = (newIsHigher: boolean) => {
    setComparisons((c) => c + 1);
    if (newIsHigher) {
      setRanked([...ranked.slice(0, j), current, ...ranked.slice(j)]);
      setQueue(queue.slice(1));
      setJ(0);
    } else if (j + 1 >= ranked.length) {
      setRanked([...ranked, current]);
      setQueue(queue.slice(1));
      setJ(0);
    } else {
      setJ(j + 1);
    }
  };

  const save = () => {
    ranked.forEach((i, idx) => setScore(i.id, 'force-rank', { rank: idx + 1 }));
    onClose();
  };

  const Card = ({ issue, label }: { issue: Issue; label: string }) => (
    <div className="pair-card">
      <div className="muted small">{label}</div>
      <div className="row"><TypeIcon type={issue.type} /><span className="issue-key">{issue.key}</span></div>
      <div className="pair-card__title">{issue.title}</div>
      {issue.userStory?.iWant && <div className="muted small">I want {issue.userStory.iWant}</div>}
    </div>
  );

  return (
    <Modal
      title="20/20 — so sánh từng cặp"
      width={720}
      onClose={onClose}
      footer={done ? <><Button variant="ghost" onClick={onClose}>Huỷ</Button><Button variant="primary" onClick={save}>Lưu thứ hạng</Button></> : undefined}
    >
      {!started && (
        <div>
          <p style={{ marginTop: 0 }}>Như khám mắt: "A hay B rõ hơn?" Luôn bắt đầu từ đầu danh sách đã xếp, chỉ so 2 item một lúc. Nên có facilitator để team thương lượng.</p>
          <label className="row">Số item cần xếp (lấy từ đầu backlog):
            <input className="input" type="number" min={2} max={issues.length} value={count} onChange={(e) => setCount(Number(e.target.value))} style={{ width: 70 }} />
          </label>
          <div style={{ marginTop: 14 }}><Button variant="primary" onClick={start} disabled={count < 2}>Bắt đầu</Button></div>
        </div>
      )}
      {started && current && (
        <div>
          <div className="row small muted" style={{ marginBottom: 10 }}>
            <span>Đã xếp {ranked.length}/{count} · {comparisons} lần so sánh</span>
            <span className="grow" />
            <span style={{ width: 160 }}><Progress value={(ranked.length / count) * 100} /></span>
          </div>
          <div className="pair">
            <button onClick={() => pick(true)}><Card issue={current} label="A · item đang xếp" /></button>
            <span className="pair__vs">vs</span>
            <button onClick={() => pick(false)}><Card issue={ranked[j]} label={`B · hạng #${j + 1} hiện tại`} /></button>
          </div>
          <div className="muted small" style={{ marginTop: 10, textAlign: 'center' }}>Bấm vào item ưu tiên cao hơn</div>
        </div>
      )}
      {done && (
        <ol className="small" style={{ paddingLeft: 20, margin: 0 }}>
          {ranked.map((i) => <li key={i.id} style={{ padding: '2px 0' }}>{i.key} · {i.title}</li>)}
        </ol>
      )}
    </Modal>
  );
}
