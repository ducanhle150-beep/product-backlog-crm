import { useState } from 'react';
import type { ReactNode } from 'react';
import { IconAdjustments, IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react';
import type { ChecklistItem, Epic, Settings } from '../../data/types';
import { useStore } from '../../store/useStore';
import { METHODS, methodById } from '../../lib/prioritization';
import { Button, Modal } from '../../components/ui/primitives';
import './settings.css';

const uid = (p: string) => `${p}${Date.now().toString(36)}`;

function Card({ title, desc, children }: { title: string; desc?: string; children: ReactNode }) {
  return (
    <section className="card st-card">
      <div className="card__head">{title}</div>
      <div className="card__body">
        {desc && <p className="muted small" style={{ marginTop: 0 }}>{desc}</p>}
        {children}
      </div>
    </section>
  );
}

function ChecklistEditor({ items, onChange, autoIds = [] }: { items: ChecklistItem[]; onChange(v: ChecklistItem[]): void; autoIds?: string[] }) {
  const [draft, setDraft] = useState('');
  return (
    <div className="st-list">
      {items.map((it) => (
        <div key={it.id} className="row">
          <input className="input grow" value={it.text} onChange={(e) => onChange(items.map((x) => (x.id === it.id ? { ...x, text: e.target.value } : x)))} />
          {autoIds.includes(it.id) && <span className="muted small" title="Tự kiểm tra từ dữ liệu item">tự động</span>}
          <button className="icon-btn" onClick={() => onChange(items.filter((x) => x.id !== it.id))}><IconTrash size={14} /></button>
        </div>
      ))}
      <div className="row">
        <input className="input grow" placeholder="+ Thêm tiêu chí (Enter)" value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && draft.trim()) { onChange([...items, { id: uid('c'), text: draft.trim() }]); setDraft(''); } }} />
      </div>
    </div>
  );
}

function NumCell({ value, onChange, step = 1 }: { value: number; onChange(v: number): void; step?: number }) {
  return <input className="input st-num" type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />;
}

/** Cấu hình riêng của SAE ICE × CAF: đối thủ, trọng số, điểm adoption, ngưỡng phase (sheet Range). */
function SaeConfig() {
  const settings = useStore((s) => s.settings);
  const up = useStore((s) => s.updateSettings);
  const { cafWeights: w, adoptionScores: a, phaseThresholds: t } = settings;
  return (
    <div className="tpl-config">
      <section>
        <div className="section-title">Đối thủ</div>
        <p className="muted small" style={{ marginTop: 0 }}>Tên đối thủ đang là placeholder — thay bằng đối thủ thật của Fraud.</p>
        <table className="st-table">
          <thead><tr><th>Tên</th><th style={{ width: 130 }}>Loại</th><th style={{ width: 36 }} /></tr></thead>
          <tbody>
            {settings.competitors.map((c) => (
              <tr key={c.id}>
                <td><input className="input st-full" value={c.name} onChange={(e) => up({ competitors: settings.competitors.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)) })} /></td>
                <td>
                  <select className="select st-full" value={c.type} onChange={(e) => up({ competitors: settings.competitors.map((x) => (x.id === c.id ? { ...x, type: e.target.value as 'direct' | 'indirect' } : x)) })}>
                    <option value="direct">Direct</option><option value="indirect">Indirect</option>
                  </select>
                </td>
                <td><button className="icon-btn" onClick={() => up({ competitors: settings.competitors.filter((x) => x.id !== c.id) })}><IconTrash size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button size="sm" variant="ghost" icon={<IconPlus size={14} />} onClick={() => up({ competitors: [...settings.competitors, { id: uid('c'), name: 'Đối thủ mới', type: 'direct' }] })}>Thêm đối thủ</Button>
      </section>
      <div className="tpl-two">
        <section>
          <div className="section-title">Trọng số loại đối thủ</div>
          <table className="st-table">
            <tbody>
              <tr><td>Direct</td><td className="st-numcol"><NumCell step={0.1} value={w.direct} onChange={(v) => up({ cafWeights: { ...w, direct: v } })} /></td></tr>
              <tr><td>Indirect</td><td className="st-numcol"><NumCell step={0.1} value={w.indirect} onChange={(v) => up({ cafWeights: { ...w, indirect: v } })} /></td></tr>
            </tbody>
          </table>
        </section>
        <section>
          <div className="section-title">Điểm adoption</div>
          <table className="st-table">
            <tbody>
              {([['no', 'No'], ['basic', 'Basic / Limited'], ['good', 'Good / Yes'], ['advanced', 'Advanced']] as const).map(([k, label]) => (
                <tr key={k}><td>{label}</td><td className="st-numcol"><NumCell step={0.1} value={a[k]} onChange={(v) => up({ adoptionScores: { ...a, [k]: v } })} /></td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      <section>
        <div className="section-title">Ngưỡng Implementation Phase (Final Score)</div>
        <table className="st-table">
          <tbody>
            <tr><td>Phase 1 · High</td><td className="muted small">Điểm lớn hơn</td><td className="st-numcol"><NumCell value={t.p1} onChange={(v) => up({ phaseThresholds: { ...t, p1: v } })} /></td></tr>
            <tr><td>Phase 2 · Medium</td><td className="muted small">Điểm từ</td><td className="st-numcol"><NumCell value={t.p2} onChange={(v) => up({ phaseThresholds: { ...t, p2: v } })} /></td></tr>
            <tr><td>Phase 3 · Low</td><td className="muted small">Điểm từ</td><td className="st-numcol"><NumCell value={t.p3} onChange={(v) => up({ phaseThresholds: { ...t, p3: v } })} /></td></tr>
            <tr><td>Phase 4 · Niche</td><td className="muted small">Dưới Phase 3</td><td className="st-numcol muted small">&lt; {t.p3}</td></tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

/** Cấu hình riêng của MoSCoW: điểm từng nhãn khi vote, danh sách stakeholder vote. */
function MoscowConfig() {
  const settings = useStore((s) => s.settings);
  const up = useStore((s) => s.updateSettings);
  const pts = settings.moscowPoints;
  return (
    <div className="tpl-config tpl-two">
      <section>
        <div className="section-title">Điểm vote</div>
        <table className="st-table">
          <tbody>
            {([['M', 'Must have'], ['S', 'Should have'], ['C', 'Could have'], ['W', "Won't have"]] as const).map(([k, label]) => (
              <tr key={k}><td><strong>{k}</strong> · {label}</td><td className="st-numcol"><NumCell value={pts[k]} onChange={(v) => up({ moscowPoints: { ...pts, [k]: v } })} /></td></tr>
            ))}
          </tbody>
        </table>
      </section>
      <section>
        <div className="section-title">Stakeholders vote</div>
        <table className="st-table">
          <tbody>
            {settings.stakeholders.map((s) => (
              <tr key={s.id}>
                <td><input className="input st-full" value={s.name} onChange={(e) => up({ stakeholders: settings.stakeholders.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)) })} /></td>
                <td style={{ width: 36 }}><button className="icon-btn" onClick={() => up({ stakeholders: settings.stakeholders.filter((x) => x.id !== s.id) })}><IconTrash size={14} /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <Button size="sm" variant="ghost" icon={<IconPlus size={14} />} onClick={() => up({ stakeholders: [...settings.stakeholders, { id: uid('sh'), name: 'Stakeholder' }] })}>Thêm stakeholder</Button>
      </section>
    </div>
  );
}

const TEMPLATE_CONFIG: Record<string, { summary(s: Settings): string; Editor(): ReactNode }> = {
  'sae-ice-caf': {
    summary: (s) => `${s.competitors.length} đối thủ · Direct ×${s.cafWeights.direct} / Indirect ×${s.cafWeights.indirect} · Phase ${s.phaseThresholds.p1} / ${s.phaseThresholds.p2} / ${s.phaseThresholds.p3}`,
    Editor: SaeConfig,
  },
  moscow: {
    summary: (s) => `M ${s.moscowPoints.M} · S ${s.moscowPoints.S} · C ${s.moscowPoints.C} · W ${s.moscowPoints.W} · ${s.stakeholders.length} stakeholder`,
    Editor: MoscowConfig,
  },
};

function TemplatePicker() {
  const settings = useStore((s) => s.settings);
  const up = useStore((s) => s.updateSettings);
  const [open, setOpen] = useState(false);
  const tpl = methodById(settings.activeMethod);
  const config = TEMPLATE_CONFIG[tpl.id];
  return (
    <>
      <label className="field">
        <span>Template đang dùng</span>
        <select className="select" value={settings.activeMethod} onChange={(e) => up({ activeMethod: e.target.value })}>
          {METHODS.map((m) => <option key={m.id} value={m.id}>{m.name}{m.id === 'sae-ice-caf' ? ' (Team)' : ''}</option>)}
        </select>
      </label>
      <div className="tpl-info">
        <div className="muted small">{tpl.description}</div>
        <div className="formula" style={{ margin: '8px 0' }}>{tpl.formula}</div>
        <div className="muted small">Nguồn: {tpl.source}</div>
      </div>
      <div className="tpl-foot">
        <span className="small grow">{config ? config.summary(settings) : <span className="muted">Template này không có cấu hình thêm.</span>}</span>
        <Button size="sm" icon={<IconAdjustments size={14} />} disabled={!config} onClick={() => setOpen(true)}>Cấu hình template</Button>
      </div>
      {open && config && (
        <Modal title={`Cấu hình template · ${tpl.name}`} width={640} onClose={() => setOpen(false)} footer={<Button variant="primary" onClick={() => setOpen(false)}>Xong</Button>}>
          <config.Editor />
        </Modal>
      )}
    </>
  );
}

/** Quản lý epic — thay cho panel Epic mở từ nút sidebar trên Bảng / Backlog. Lọc theo epic dùng menu Filter. */
function EpicsEditor() {
  const epics = useStore((s) => s.epics);
  const goals = useStore((s) => s.settings.goals);
  const issues = useStore((s) => s.issues);
  const createEpic = useStore((s) => s.createEpic);
  const updateEpic = useStore((s) => s.updateEpic);
  const deleteEpic = useStore((s) => s.deleteEpic);
  const [removing, setRemoving] = useState<Epic | null>(null);
  const progress = (id: string) => {
    const list = issues.filter((i) => i.epicId === id && !i.archived);
    return { done: list.filter((i) => i.status === 'done').length, total: list.length };
  };
  return (
    <div className="st-list">
      {epics.map((e) => {
        const p = progress(e.id);
        return (
          <div key={e.id} className="row">
            <input type="color" className="st-color" value={e.color} onChange={(ev) => updateEpic(e.id, { color: ev.target.value })} />
            <input className="input grow" value={e.name} onChange={(ev) => updateEpic(e.id, { name: ev.target.value })} />
            <select className="select st-epic-goal" value={e.goalId ?? ''} onChange={(ev) => updateEpic(e.id, { goalId: ev.target.value || undefined })}>
              <option value="">Chưa gắn goal</option>
              {goals.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <span className="muted small st-epic-progress" title="Issue hoàn thành / tổng issue thuộc epic">{p.done}/{p.total}</span>
            <button className="icon-btn" onClick={() => (p.total ? setRemoving(e) : deleteEpic(e.id))}><IconTrash size={14} /></button>
          </div>
        );
      })}
      <Button size="sm" variant="ghost" icon={<IconPlus size={14} />} onClick={() => createEpic('Epic mới')}>Thêm epic</Button>
      {removing && (
        <Modal title={`Xoá epic "${removing.name}"?`} onClose={() => setRemoving(null)} footer={<><Button variant="ghost" onClick={() => setRemoving(null)}>Huỷ</Button><Button variant="danger" onClick={() => { deleteEpic(removing.id); setRemoving(null); }}>Xoá</Button></>}>
          {progress(removing.id).total} issue đang thuộc epic này sẽ chuyển về "Không thuộc epic nào".
        </Modal>
      )}
    </div>
  );
}

export function SettingsView() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const reset = useStore((s) => s.reset);
  const [confirmReset, setConfirmReset] = useState(false);
  const up = (patch: Partial<Settings>) => updateSettings(patch);

  return (
    <div className="view-scroll">
      <div className="st-grid">

        <Card title="Strategic goals" desc="Mục tiêu chiến lược (roadmap theme / OKR) mà epic và item gắn vào — dùng để kiểm tra item không phục vụ goal nào trong Insights.">
          <div className="st-list">
            {settings.goals.map((g) => (
              <div key={g.id} className="row">
                <input type="color" className="st-color" value={g.color} onChange={(e) => up({ goals: settings.goals.map((x) => (x.id === g.id ? { ...x, color: e.target.value } : x)) })} />
                <input className="input grow" value={g.name} onChange={(e) => up({ goals: settings.goals.map((x) => (x.id === g.id ? { ...x, name: e.target.value } : x)) })} />
                <button className="icon-btn" onClick={() => up({ goals: settings.goals.filter((x) => x.id !== g.id) })}><IconTrash size={14} /></button>
              </div>
            ))}
            <Button size="sm" variant="ghost" icon={<IconPlus size={14} />} onClick={() => up({ goals: [...settings.goals, { id: uid('g'), name: 'Goal mới', color: '#8b5cf6' }] })}>Thêm goal</Button>
          </div>
        </Card>

        <Card title="Epics" desc="Nhóm item / issue theo epic, gắn với strategic goal. Tiến độ = issue hoàn thành / tổng issue thuộc epic. Lọc theo epic trên Bảng và Backlog dùng menu Filter.">
          <EpicsEditor />
        </Card>

        <Card title="Definition of Ready" desc="Item phải đạt trước khi được kéo vào sprint. 5 tiêu chí đầu tự kiểm tra từ dữ liệu (user story, AC, estimate, ≤ 8 pt, không bị block).">
          <ChecklistEditor items={settings.dorItems} onChange={(dorItems) => up({ dorItems })} autoIds={['dor1', 'dor2', 'dor3', 'dor4', 'dor5']} />
        </Card>


        <Card title="Prioritization template" desc="Template quyết định điểm hiển thị trong Danh sách, Ưu tiên, Sprint Planning và panel chi tiết. Điểm đã chấm theo template khác vẫn được giữ khi đổi qua lại.">
          <TemplatePicker />
        </Card>

        <Card title="Dữ liệu demo" desc="Dữ liệu lưu trong trình duyệt (localStorage). Reset để quay về dữ liệu gốc (26 backlog item + 18 issue trên Bảng) + dữ liệu demo.">
          <Button variant="danger" icon={<IconRefresh size={14} />} onClick={() => setConfirmReset(true)}>Reset dữ liệu demo</Button>
        </Card>
      </div>
      {confirmReset && (
        <Modal title="Reset dữ liệu demo?" onClose={() => setConfirmReset(false)} footer={<><Button variant="ghost" onClick={() => setConfirmReset(false)}>Huỷ</Button><Button variant="danger" onClick={() => { reset(); setConfirmReset(false); }}>Reset</Button></>}>
          Mọi thay đổi (điểm, sprint, ideas, thiết lập) sẽ mất và quay về dữ liệu ban đầu.
        </Modal>
      )}
    </div>
  );
}
