// Modal chi tiết issue trên Bảng — dựng lại theo modal issue của CRM gốc.
// Khác CRM duy nhất ở khối "Từ Product Backlog": chỉ hiện khi item gốc đã điền user story / AC / why now / success metric, sửa được như trên item.
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  IconArrowBackUp, IconArrowsDiagonal, IconArrowsDiagonalMinimize2, IconCalendar, IconChevronDown, IconChevronRight, IconChevronUp,
  IconClock, IconDotsVertical, IconLink, IconListDetails, IconPlus, IconSettings, IconSparkles, IconStack2, IconTrash, IconUserCircle, IconX,
} from '@tabler/icons-react';
import { format } from 'date-fns';
import type { Issue, IssueType, Priority, StatusId } from '../../data/types';
import { LABELS, MEMBERS } from '../../data/seed';
import { BOARD_STATUSES } from '../../data/meta';
import { useStore } from '../../store/useStore';
import { PriorityIcon, StatusIcon, TypeIcon } from '../ui/icons';
import { Avatar, Button, LabelChip, Modal, memberById } from '../ui/primitives';
import './issueModal.css';

// Nhãn tiếng Việt như CRM gốc.
const TYPE_VI: Record<Exclude<IssueType, 'epic'>, string> = { story: 'Story', task: 'Nhiệm vụ', bug: 'Lỗi', spike: 'Spike' };
const PRIORITY_VI: Record<Priority, string> = { urgent: 'Khẩn cấp', high: 'Cao', medium: 'Vừa', low: 'Thấp' };
const FIB = [1, 2, 3, 5, 8, 13, 20];

/** Dòng thuộc tính ở cột phải; `empty` dùng cho "Ẩn trường trống". */
type Row = { label: string; empty: boolean; node: ReactNode };

function PropGroup({ title, rows, right }: { title: string; rows: Row[]; right?: ReactNode }) {
  const [hideEmpty, setHideEmpty] = useState(false);
  const shown = hideEmpty ? rows.filter((r) => !r.empty) : rows;
  return (
    <section className="im-group">
      <div className="im-group__head"><span>{title}</span>{right}</div>
      {shown.map((r) => (
        <div key={r.label} className="im-prop">
          <span className="im-prop__label truncate">{r.label}</span>
          <div className="im-prop__value">{r.node}</div>
        </div>
      ))}
      {rows.some((r) => r.empty) && (
        <button className="im-hide-empty" onClick={() => setHideEmpty(!hideEmpty)}>
          {hideEmpty ? <IconChevronRight size={12} /> : <IconChevronDown size={12} />} {hideEmpty ? 'Hiện trường trống' : 'Ẩn trường trống'}
        </button>
      )}
    </section>
  );
}

const hasStory = (i: Issue) => !!i.userStory && !!(i.userStory.asA || i.userStory.iWant || i.userStory.soThat);

type CtxField = 'story' | 'ac' | 'why' | 'metric';
const CTX_FIELDS: { key: CtxField; name: string }[] = [
  { key: 'story', name: 'User story' },
  { key: 'ac', name: 'Acceptance criteria' },
  { key: 'why', name: 'Why now' },
  { key: 'metric', name: 'Success metric' },
];
/** Các trường PM item backlog đã điền — quyết định khối "Từ Product Backlog" có hiện không và hiện trường nào. */
const filledFields = (i: Issue): CtxField[] => [
  ...(hasStory(i) ? ['story' as const] : []),
  ...(i.acceptanceCriteria.length ? ['ac' as const] : []),
  ...(i.whyNow.trim() ? ['why' as const] : []),
  ...(i.successMetric.trim() ? ['metric' as const] : []),
];

/** Thông tin PM mang từ item backlog sang, vẫn sửa được khi đã là issue.
 *  Trường hiện ra cố định theo lúc mở modal (xoá trắng khi đang sửa không làm trường biến mất); trường trống thêm bằng nút "+". */
function BacklogContext({ issue }: { issue: Issue }) {
  const updateIssue = useStore((s) => s.updateIssue);
  const up = (patch: Partial<Issue>, activity?: string) => updateIssue(issue.id, patch, activity);
  const [open, setOpen] = useState(true);
  const [fields, setFields] = useState<CtxField[]>(() => filledFields(issue));
  const [newAc, setNewAc] = useState('');
  if (!fields.length) return null;
  const story = issue.userStory ?? { asA: '', iWant: '', soThat: '' };
  const acs = issue.acceptanceCriteria;
  const acDone = acs.filter((a) => a.done).length;
  const addAc = () => {
    if (!newAc.trim()) return;
    up({ acceptanceCriteria: [...acs, { id: `ac${Date.now()}`, text: newAc.trim(), done: false }] }, 'Thêm acceptance criterion');
    setNewAc('');
  };
  return (
    <section className="im-ctx">
      <button className="im-ctx__head" onClick={() => setOpen(!open)}>
        {open ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        <IconListDetails size={14} color="#3b82f6" />
        <span>Từ Product Backlog</span>
      </button>
      {open && (
        <div className="im-ctx__body">
          {fields.includes('story') && (
            <div className="im-ctx__field">
              <div className="im-ctx__label">User story</div>
              <div className="im-story">
                {([['asA', 'As a', 'loại merchant / user'], ['iWant', 'I want', 'mục tiêu'], ['soThat', 'So that', 'lý do / giá trị']] as const).map(([k, label, ph]) => (
                  <label key={k}><b>{label}</b>
                    <input className="im-edit" value={story[k]} placeholder={ph} onChange={(e) => up({ userStory: { ...story, [k]: e.target.value } })} />
                  </label>
                ))}
              </div>
            </div>
          )}
          {fields.includes('ac') && (
            <div className="im-ctx__field">
              <div className="im-ctx__label">Acceptance criteria ({acDone}/{acs.length})</div>
              {acs.map((ac) => (
                <div key={ac.id} className="im-ac">
                  <input
                    type="checkbox"
                    checked={ac.done}
                    onChange={(e) => up({ acceptanceCriteria: acs.map((a) => (a.id === ac.id ? { ...a, done: e.target.checked } : a)) }, `${e.target.checked ? 'Đạt' : 'Bỏ đạt'} AC: ${ac.text}`)}
                  />
                  <input className={`im-edit ${ac.done ? 'im-ac--done' : ''}`} value={ac.text} onChange={(e) => up({ acceptanceCriteria: acs.map((a) => (a.id === ac.id ? { ...a, text: e.target.value } : a)) })} />
                  <button className="icon-btn im-ac__del" title="Xoá tiêu chí" onClick={() => up({ acceptanceCriteria: acs.filter((a) => a.id !== ac.id) }, `Xoá AC: ${ac.text}`)}><IconTrash size={13} /></button>
                </div>
              ))}
              <div className="im-ac">
                <IconPlus size={13} className="muted" style={{ margin: '0 1px' }} />
                <input className="im-edit" placeholder="Thêm tiêu chí (Enter)" value={newAc} onChange={(e) => setNewAc(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addAc()} onBlur={addAc} />
              </div>
            </div>
          )}
          {fields.includes('why') && (
            <div className="im-ctx__field">
              <div className="im-ctx__label">Why now</div>
              <textarea className="im-edit" rows={2} placeholder="Vì sao item này quan trọng, vì sao là bây giờ?" value={issue.whyNow} onChange={(e) => up({ whyNow: e.target.value })} />
            </div>
          )}
          {fields.includes('metric') && (
            <div className="im-ctx__field">
              <div className="im-ctx__label">Success metric</div>
              <input className="im-edit" placeholder="Mục tiêu nhị phân / metric cần thay đổi / hành vi cần theo dõi" value={issue.successMetric} onChange={(e) => up({ successMetric: e.target.value })} />
            </div>
          )}
          {fields.length < CTX_FIELDS.length && (
            <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
              {CTX_FIELDS.filter((f) => !fields.includes(f.key)).map((f) => (
                <button key={f.key} className="im-ctx__add" onClick={() => setFields([...fields, f.key].sort((a, b) => CTX_FIELDS.findIndex((x) => x.key === a) - CTX_FIELDS.findIndex((x) => x.key === b)))}>
                  <IconPlus size={12} /> {f.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Description({ issue }: { issue: Issue }) {
  const updateIssue = useStore((s) => s.updateIssue);
  const [draft, setDraft] = useState(issue.description);
  const [editing, setEditing] = useState(false);
  return (
    <div className="im-desc">
      <textarea
        className={`im-desc__input ${editing ? 'is-editing' : ''}`}
        placeholder="Mô tả issue..."
        rows={editing ? 8 : 3}
        value={draft}
        onFocus={() => setEditing(true)}
        onChange={(e) => setDraft(e.target.value)}
      />
      {editing && (
        <div className="im-desc__actions">
          <button className="im-btn-ghost" onClick={() => { setDraft(issue.description); setEditing(false); }}>Hủy bỏ</button>
          <button className="im-btn-primary" onClick={() => { updateIssue(issue.id, { description: draft }, 'Cập nhật mô tả'); setEditing(false); }}>Lưu</button>
        </div>
      )}
    </div>
  );
}

type Tab = 'comment' | 'time' | 'history' | 'ai';

function Activity({ issue }: { issue: Issue }) {
  const [tab, setTab] = useState<Tab>('comment');
  const me = memberById(issue.reporterId) ?? MEMBERS[0];
  return (
    <div className="im-activity">
      <div className="im-tabs">
        {([['comment', 'Bình luận'], ['time', 'Ghi nhận thời gian'], ['history', 'Lịch sử'], ['ai', 'Hỏi AI']] as [Tab, string][]).map(([t, name]) => (
          <button key={t} className={tab === t ? 'is-active' : ''} onClick={() => setTab(t)}>{t === 'ai' && <IconSparkles size={13} />}{name}</button>
        ))}
      </div>
      {tab === 'comment' && (
        <>
          <div className="row" style={{ alignItems: 'flex-start', gap: 10 }}>
            <Avatar member={me} size={22} />
            <div className="im-comment grow">
              <input placeholder="Để lại bình luận, gõ @ để nhắc tên" />
              <button className="im-btn-primary" disabled>Bình luận</button>
            </div>
          </div>
          <div className="muted im-empty">Chưa có bình luận. Hãy đặt câu hỏi hoặc chia sẻ cập nhật.</div>
        </>
      )}
      {tab === 'history' && (
        issue.activity.length ? [...issue.activity].reverse().map((a, i) => (
          <div key={i} className="row small" style={{ padding: '4px 0' }}>
            <span className="muted" style={{ width: 100, flexShrink: 0 }}>{format(new Date(a.at), 'MMM d, HH:mm')}</span>
            <span>{a.text}</span>
          </div>
        )) : <div className="muted im-empty">Chưa có lịch sử.</div>
      )}
      {(tab === 'time' || tab === 'ai') && <div className="muted im-empty">Phần này dùng nguyên tính năng của CRM.</div>}
    </div>
  );
}

function Sidebar({ issue }: { issue: Issue }) {
  const { updateIssue, epics, sprints } = useStore();
  const [pickDate, setPickDate] = useState(false);
  const up = (patch: Partial<Issue>, activity?: string) => updateIssue(issue.id, patch, activity);
  const labels = LABELS.filter((l) => issue.labelIds.includes(l.id));
  const type = issue.type === 'epic' ? 'task' : issue.type;

  const props: Row[] = [
    { label: 'Trạng thái', empty: false, node: (
      <span className="row"><StatusIcon status={issue.status} />
        <select className="select select--bare" value={issue.status} onChange={(e) => up({ status: e.target.value as StatusId }, `Trạng thái → ${e.target.value}`)}>
          {BOARD_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </span>
    ) },
    { label: 'Loại', empty: false, node: (
      <span className="row"><TypeIcon type={type} />
        <select className="select select--bare" value={type} onChange={(e) => up({ type: e.target.value as IssueType })}>
          {(Object.keys(TYPE_VI) as (keyof typeof TYPE_VI)[]).map((t) => <option key={t} value={t}>{TYPE_VI[t]}</option>)}
        </select>
      </span>
    ) },
    { label: 'Ưu tiên', empty: false, node: (
      <span className="row"><PriorityIcon priority={issue.priority} />
        <select className="select select--bare" value={issue.priority} onChange={(e) => up({ priority: e.target.value as Priority })}>
          {(Object.keys(PRIORITY_VI) as Priority[]).map((p) => <option key={p} value={p}>{PRIORITY_VI[p]}</option>)}
        </select>
      </span>
    ) },
    { label: 'Người được giao', empty: !issue.assigneeId, node: (
      <span className="row">{issue.assigneeId ? <Avatar member={memberById(issue.assigneeId)} size={18} /> : <IconUserCircle size={18} className="muted" />}
        <select className="select select--bare" value={issue.assigneeId ?? ''} onChange={(e) => up({ assigneeId: e.target.value || undefined })}>
          <option value="">Chưa giao</option>
          {MEMBERS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </span>
    ) },
    { label: 'Người tạo', empty: !issue.reporterId, node: (
      <span className="row">{issue.reporterId && <Avatar member={memberById(issue.reporterId)} size={18} />}{memberById(issue.reporterId)?.name ?? <span className="muted">—</span>}</span>
    ) },
    { label: 'Hạn hoàn thành', empty: !issue.dueDate, node: (
      <span className="row"><IconCalendar size={15} className="muted" />
        {issue.dueDate || pickDate
          ? <input className="input input--bare" type="date" autoFocus={pickDate} value={issue.dueDate ?? ''} onChange={(e) => up({ dueDate: e.target.value || undefined })} onBlur={() => setPickDate(false)} />
          : <button className="muted" onClick={() => setPickDate(true)}>Không có hạn</button>}
      </span>
    ) },
  ];

  const plan: Row[] = [
    { label: 'Sprint', empty: !issue.sprintId, node: (
      <span className="row"><IconCalendar size={15} className="muted" />
        <select className="select select--bare" value={issue.sprintId ?? ''} onChange={(e) => up({ sprintId: e.target.value || undefined })}>
          <option value="">Không có sprint</option>
          {sprints.filter((s) => s.state !== 'completed').map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </span>
    ) },
    { label: 'Epic', empty: !issue.epicId, node: (
      <span className="row"><IconStack2 size={15} className="muted" />
        <select className="select select--bare" value={issue.epicId ?? ''} onChange={(e) => up({ epicId: e.target.value || undefined })}>
          <option value="">Không thuộc epic nào</option>
          {epics.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
        </select>
      </span>
    ) },
    // Story point mang từ item backlog sang; issue tạo thẳng trên Bảng thì để trống.
    { label: 'Story point', empty: issue.storyPoints == null, node: (
      <select className="select select--bare" value={issue.storyPoints ?? ''} onChange={(e) => up({ storyPoints: e.target.value ? Number(e.target.value) : undefined })}>
        <option value="">Chưa ước lượng</option>
        {FIB.map((p) => <option key={p} value={p}>{p}</option>)}
      </select>
    ) },
    { label: 'Nhãn', empty: labels.length === 0, node: labels.length ? <span className="row" style={{ flexWrap: 'wrap', gap: 4 }}>{labels.map((l) => <LabelChip key={l.id} label={l} />)}</span> : <span className="muted">Không có nhãn</span> },
    { label: 'Khóa', empty: false, node: <span>{issue.key}</span> },
  ];

  const customer: Row[] = [
    { label: 'Merchant', empty: true, node: <span className="muted">Không có merchant</span> },
    { label: 'Chat', empty: true, node: <span className="muted">Không có hội thoại</span> },
  ];

  return (
    <aside className="im-side">
      <PropGroup title="Thuộc tính" rows={props} right={<button className="icon-btn" title="Tuỳ chỉnh trường"><IconSettings size={15} /></button>} />
      <PropGroup title="Kế hoạch" rows={plan} />
      <PropGroup title="Khách hàng" rows={customer} />
      <section className="im-group">
        <div className="im-group__head"><span>Theo dõi thời gian</span><span className="im-time">0m</span></div>
        <div className="im-time-row">
          <span className="muted grow">Chưa ghi nhận thời gian</span>
          <button className="im-link-plain">Đặt ước lượng</button>
          <button className="im-link"><IconClock size={13} /> Ghi nhận thời gian</button>
        </div>
      </section>
    </aside>
  );
}

const STATUS_ORDER = BOARD_STATUSES.map((s) => s.id);

export function IssueModal() {
  const id = useStore((s) => s.selectedIssueId);
  const issues = useStore((s) => s.issues);
  const openIssue = useStore((s) => s.openIssue);
  const returnToBacklog = useStore((s) => s.returnToBacklog);
  const sprints = useStore((s) => s.sprints);
  const [expanded, setExpanded] = useState(false);
  const [confirmBack, setConfirmBack] = useState(false);
  const issue = issues.find((i) => i.id === id);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') openIssue(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openIssue]);

  if (!issue || issue.kind !== 'task') return null;

  // Điều hướng ↑/↓ giữa các issue trên Bảng (theo cột, rồi rank).
  const board = issues
    .filter((i) => i.kind === 'task' && !i.archived)
    .sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.rank - b.rank);
  const idx = board.findIndex((i) => i.id === issue.id);

  return (
    <div className="im-backdrop" onMouseDown={() => openIssue(null)}>
      <div className={`im ${expanded ? 'im--expanded' : ''}`} onMouseDown={(e) => e.stopPropagation()}>
        <header className="im-head">
          <span className="project-badge">FRA</span>
          <span className="muted">MIDA Fraud Feature</span>
          <IconChevronRight size={13} className="muted" />
          <TypeIcon type={issue.type} />
          <span className="issue-key" style={{ color: 'var(--text)' }}>{issue.key}</span>
          <span className="grow" />
          <button className="im-head__back" onClick={() => setConfirmBack(true)} title="Đưa issue về lại Product Backlog thành item"><IconArrowBackUp size={15} /> Trả về Backlog</button>
          <span className="im-head__sep" />
          <span className="muted small">{idx + 1} / {board.length}</span>
          <button className="icon-btn" disabled={idx <= 0} onClick={() => openIssue(board[idx - 1].id)} aria-label="Issue trước"><IconChevronUp size={16} /></button>
          <button className="icon-btn" disabled={idx >= board.length - 1} onClick={() => openIssue(board[idx + 1].id)} aria-label="Issue sau"><IconChevronDown size={16} /></button>
          <span className="im-head__sep" />
          <button className="icon-btn" title="Sao chép liên kết"><IconLink size={15} /></button>
          <button className="icon-btn" aria-label="Thêm"><IconDotsVertical size={15} /></button>
          <button className="icon-btn" onClick={() => setExpanded(!expanded)} aria-label="Phóng to">{expanded ? <IconArrowsDiagonalMinimize2 size={15} /> : <IconArrowsDiagonal size={15} />}</button>
          <button className="icon-btn" onClick={() => openIssue(null)} aria-label="Đóng"><IconX size={16} /></button>
        </header>
        <div className="im-body" key={issue.id}>
          <main className="im-main">
            <input className="im-title" value={issue.title} onChange={(e) => useStore.getState().updateIssue(issue.id, { title: e.target.value })} />
            <Description issue={issue} />
            <BacklogContext issue={issue} />
            <button className="im-subissue"><IconPlus size={14} /> Thêm issue con</button>
            <Activity issue={issue} />
          </main>
          <Sidebar issue={issue} />
        </div>
        {confirmBack && (
          <Modal
            title={`Trả ${issue.key} về Product Backlog?`}
            onClose={() => setConfirmBack(false)}
            footer={<>
              <Button variant="ghost" onClick={() => setConfirmBack(false)}>Huỷ</Button>
              {/* Mở luôn item trong drawer để thấy ngay kết quả. */}
              <Button variant="primary" icon={<IconArrowBackUp size={14} />} onClick={() => { returnToBacklog(issue.id); setConfirmBack(false); openIssue(issue.id); }}>Trả về Backlog</Button>
            </>}
          >
            Issue sẽ rời Bảng{issue.sprintId ? ` và ${sprints.find((sp) => sp.id === issue.sprintId)?.name}` : ''}, quay về Product Backlog ở trạng thái Backlog.
            Mô tả, user story, acceptance criteria, story point, điểm ưu tiên… đều được giữ nguyên.
          </Modal>
        )}
      </div>
    </div>
  );
}
