// COPE (Capture → Organize → Prioritize → Execute): inbox ý tưởng + intake gate trước khi vào backlog.
import { useState } from 'react';
import { IconArrowRight, IconBulb, IconParking, IconPlus, IconQuote, IconRestore, IconX } from '@tabler/icons-react';
import { format } from 'date-fns';
import type { Idea, Source } from '../../data/types';
import { SOURCES } from '../../data/meta';
import { useStore } from '../../store/useStore';
import { Badge, Button, Modal } from '../../components/ui/primitives';
import './ideas.css';

export const GATE = [
  { id: 'g1', text: 'Hỗ trợ vision / "why" của sản phẩm' },
  { id: 'g2', text: 'Có dữ liệu chứng minh, không chỉ cảm tính' },
  { id: 'g3', text: 'Nguồn đáng tin: khách trả phí lâu năm / dùng sâu' },
  { id: 'g4', text: 'Tạo khác biệt hoặc giúp theo kịp thị trường' },
  { id: 'g5', text: 'Nếu không làm ngay, vẫn đáng giữ trong backlog' },
];
const MIN_GATE = 3;

const STAGES = [
  { key: 'C', name: 'Capture', text: 'Thu nhận input từ khách, team, investor — đánh giá nguồn, dữ liệu, chất lượng, vision.' },
  { key: 'O', name: 'Organize', text: 'Phân loại theo nguồn × loại, theo project/epic; chỉ PM sửa backlog chính.' },
  { key: 'P', name: 'Prioritize', text: 'Urgency, value, cost-efficiency, relevancy, complexity → tab Ưu tiên.' },
  { key: 'E', name: 'Execute', text: 'Refinement → Sprint planning → Sprint → Review → Retro.' },
];

function NewIdea({ onClose }: { onClose(): void }) {
  const createIdea = useStore((s) => s.createIdea);
  const [d, setD] = useState({ title: '', description: '', source: 'paying' as Source, requester: '', quote: '' });
  return (
    <Modal title="Ghi nhận ý tưởng" onClose={onClose} footer={<><Button variant="ghost" onClick={onClose}>Huỷ</Button><Button variant="primary" disabled={!d.title.trim()} onClick={() => { createIdea({ ...d, title: d.title.trim() }); onClose(); }}>Thêm vào inbox</Button></>}>
      <div style={{ display: 'grid', gap: 10 }}>
        <label className="field"><span>Ý tưởng</span><input className="input" autoFocus value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} /></label>
        <label className="field"><span>Mô tả</span><textarea className="textarea" rows={3} value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} /></label>
        <div className="row">
          <label className="field grow"><span>Nguồn</span>
            <select className="select" value={d.source} onChange={(e) => setD({ ...d, source: e.target.value as Source })}>{(Object.keys(SOURCES) as Source[]).map((s) => <option key={s} value={s}>{SOURCES[s]}</option>)}</select>
          </label>
          <label className="field grow"><span>Người yêu cầu</span><input className="input" value={d.requester} onChange={(e) => setD({ ...d, requester: e.target.value })} /></label>
        </div>
        <label className="field"><span>Quote khách hàng</span><input className="input" value={d.quote} placeholder='"…"' onChange={(e) => setD({ ...d, quote: e.target.value })} /></label>
      </div>
    </Modal>
  );
}

function IdeaCard({ idea }: { idea: Idea }) {
  const updateIdea = useStore((s) => s.updateIdea);
  const promoteIdea = useStore((s) => s.promoteIdea);
  const openIssue = useStore((s) => s.openIssue);
  const issues = useStore((s) => s.issues);
  const passed = GATE.filter((g) => idea.gate[g.id]).length;
  const ageDays = Math.round((Date.now() - new Date(idea.createdAt).getTime()) / 86400000);
  return (
    <div className="idea">
      <div className="row">
        <IconBulb size={16} color="#f59e0b" />
        <strong className="grow">{idea.title}</strong>
        <Badge>{SOURCES[idea.source]}</Badge>
        <button className="idea__count" title="Thêm 1 lần được yêu cầu" onClick={() => updateIdea(idea.id, { requestCount: idea.requestCount + 1 })}>×{idea.requestCount} +1</button>
      </div>
      {idea.description && <div className="muted" style={{ marginTop: 4 }}>{idea.description}</div>}
      {idea.quote && <div className="idea__quote"><IconQuote size={13} /> {idea.quote}</div>}
      <div className="muted small" style={{ marginTop: 4 }}>{idea.requester || '—'} · {format(new Date(idea.createdAt), 'MMM d, yyyy')}{ageDays > 180 && ' · quá 6 tháng'}</div>

      {(idea.status === 'inbox' || idea.status === 'parking') && (
        <>
          <div className="idea__gate">
            {GATE.map((g) => (
              <label key={g.id} className="check small">
                <input type="checkbox" checked={!!idea.gate[g.id]} onChange={(e) => updateIdea(idea.id, { gate: { ...idea.gate, [g.id]: e.target.checked } })} />
                {g.text}
              </label>
            ))}
          </div>
          <div className="idea__actions">
            <span style={{ whiteSpace: 'nowrap' }} className={`small ${passed >= MIN_GATE ? '' : 'muted'}`}>Intake gate {passed}/{GATE.length}</span>
            <span className="grow" />
            <Button size="sm" variant="ghost" icon={<IconX size={14} />} onClick={() => updateIdea(idea.id, { status: 'rejected' })}>Từ chối</Button>
            {idea.status === 'inbox' && <Button size="sm" icon={<IconParking size={14} />} onClick={() => updateIdea(idea.id, { status: 'parking' })}>Parking lot</Button>}
            <Button size="sm" variant="primary" icon={<IconArrowRight size={14} />} disabled={passed < MIN_GATE} title={passed < MIN_GATE ? `Cần ≥ ${MIN_GATE} tiêu chí intake gate` : ''} onClick={() => promoteIdea(idea.id)}>Đưa vào backlog</Button>
          </div>
        </>
      )}
      {idea.status === 'promoted' && idea.promotedIssueId && (
        <button className="link-btn small" style={{ marginTop: 6 }} onClick={() => openIssue(idea.promotedIssueId!)}>→ {issues.find((i) => i.id === idea.promotedIssueId)?.key}</button>
      )}
      {idea.status === 'rejected' && <Button size="sm" variant="ghost" icon={<IconRestore size={14} />} style={{ marginTop: 6 }} onClick={() => updateIdea(idea.id, { status: 'inbox' })}>Khôi phục</Button>}
    </div>
  );
}

export function IdeasView() {
  const ideas = useStore((s) => s.ideas);
  const [tab, setTab] = useState<Idea['status']>('inbox');
  const [adding, setAdding] = useState(false);
  const count = (s: Idea['status']) => ideas.filter((i) => i.status === s).length;
  const list = ideas.filter((i) => i.status === tab).sort((a, b) => b.requestCount - a.requestCount || b.createdAt.localeCompare(a.createdAt));
  return (
    <div className="view-scroll">
      <div className="cope">
        {STAGES.map((s) => (
          <div key={s.key} className={`cope__step ${s.key === 'C' || s.key === 'O' ? 'is-here' : ''}`}>
            <span className="cope__key">{s.key}</span>
            <div><strong>{s.name}</strong><div className="muted small">{s.text}</div></div>
          </div>
        ))}
      </div>
      <div className="row" style={{ margin: '16px 0 12px' }}>
        <div className="seg seg--sm">
          {(['inbox', 'parking', 'promoted', 'rejected'] as Idea['status'][]).map((s) => (
            <button key={s} className={tab === s ? 'is-active' : ''} onClick={() => setTab(s)}>
              {{ inbox: 'Inbox', parking: 'Parking lot', promoted: 'Đã vào backlog', rejected: 'Từ chối' }[s]} ({count(s)})
            </button>
          ))}
        </div>
        <span className="muted small">Ai cũng gửi được ý tưởng; chỉ PM đưa vào backlog sau khi qua intake gate. Triage inbox hàng tuần.</span>
        <span className="grow" />
        <Button variant="primary" size="sm" icon={<IconPlus size={14} />} onClick={() => setAdding(true)}>Ghi nhận ý tưởng</Button>
      </div>
      <div className="ideas">{list.map((i) => <IdeaCard key={i.id} idea={i} />)}</div>
      {list.length === 0 && <div className="empty">Trống</div>}
      {adding && <NewIdea onClose={() => setAdding(false)} />}
    </div>
  );
}
