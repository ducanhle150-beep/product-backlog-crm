import { useState } from 'react';
import type { ReactNode } from 'react';
import { IconPlus, IconRefresh, IconTrash } from '@tabler/icons-react';
import type { ChecklistItem, Settings } from '../../data/types';
import { useStore } from '../../store/useStore';
import { METHODS } from '../../lib/prioritization';
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
          {autoIds.includes(it.id) && <span className="muted small" title="Tự kiểm tra từ dữ liệu issue">tự động</span>}
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

function Num({ label, value, onChange, step = 1 }: { label: string; value: number; onChange(v: number): void; step?: number }) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className="input" type="number" step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} style={{ width: 90 }} />
    </label>
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
        <Card title="Vision & lý do backlog tồn tại" desc='"Tầm nhìn của sản phẩm là ___. Vì vậy, việc có tác động lớn nhất cho vision là ___." Mọi item trong backlog phải phục vụ câu này.'>
          <label className="field"><span>Tầm nhìn sản phẩm</span><textarea className="textarea" rows={2} value={settings.vision} onChange={(e) => up({ vision: e.target.value })} /></label>
          <label className="field" style={{ marginTop: 8 }}><span>Việc có tác động lớn nhất</span><textarea className="textarea" rows={2} value={settings.visionImpact} onChange={(e) => up({ visionImpact: e.target.value })} /></label>
        </Card>

        <Card title="Strategic goals" desc="Roadmap theme / OKR mà item gắn vào. Màu dùng để tô theo goal.">
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

        <Card title="Definition of Ready" desc="Item phải đạt trước khi được kéo vào sprint. 5 tiêu chí đầu tự kiểm tra từ dữ liệu (user story, AC, estimate, ≤ 8 pt, không bị block).">
          <ChecklistEditor items={settings.dorItems} onChange={(dorItems) => up({ dorItems })} autoIds={['dor1', 'dor2', 'dor3', 'dor4', 'dor5']} />
        </Card>

        <Card title="Definition of Done" desc="Item chỉ được chuyển sang DONE (Kanban) khi tick đủ các tiêu chí này.">
          <ChecklistEditor items={settings.dodItems} onChange={(dodItems) => up({ dodItems })} />
        </Card>

        <Card title="Prioritization" desc="Method mặc định quyết định điểm hiển thị trong Danh sách, Buckets, Sprint Planning.">
          <label className="field"><span>Method đang dùng</span>
            <select className="select" value={settings.activeMethod} onChange={(e) => up({ activeMethod: e.target.value })}>
              {METHODS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </label>
          <div className="section-title" style={{ marginTop: 14 }}>MoSCoW — điểm vote</div>
          <div className="row">
            {(['M', 'S', 'C', 'W'] as const).map((k) => <Num key={k} label={k} value={settings.moscowPoints[k]} onChange={(v) => up({ moscowPoints: { ...settings.moscowPoints, [k]: v } })} />)}
          </div>
          <div className="section-title" style={{ marginTop: 14 }}>Stakeholders (vote MoSCoW)</div>
          <div className="st-list">
            {settings.stakeholders.map((s) => (
              <div key={s.id} className="row">
                <input className="input grow" value={s.name} onChange={(e) => up({ stakeholders: settings.stakeholders.map((x) => (x.id === s.id ? { ...x, name: e.target.value } : x)) })} />
                <button className="icon-btn" onClick={() => up({ stakeholders: settings.stakeholders.filter((x) => x.id !== s.id) })}><IconTrash size={14} /></button>
              </div>
            ))}
            <Button size="sm" variant="ghost" icon={<IconPlus size={14} />} onClick={() => up({ stakeholders: [...settings.stakeholders, { id: uid('sh'), name: 'Stakeholder' }] })}>Thêm stakeholder</Button>
          </div>
        </Card>

        <Card title="SAE ICE × CAF — đối thủ & bảng tra" desc="Theo sheet Range của file SAE - Backlog - MIDA Heatmap. Tên đối thủ đang là placeholder — thay bằng đối thủ thật của Fraud.">
          <div className="st-list">
            {settings.competitors.map((c) => (
              <div key={c.id} className="row">
                <input className="input grow" value={c.name} onChange={(e) => up({ competitors: settings.competitors.map((x) => (x.id === c.id ? { ...x, name: e.target.value } : x)) })} />
                <select className="select" value={c.type} onChange={(e) => up({ competitors: settings.competitors.map((x) => (x.id === c.id ? { ...x, type: e.target.value as 'direct' | 'indirect' } : x)) })}>
                  <option value="direct">Direct</option><option value="indirect">Indirect</option>
                </select>
                <button className="icon-btn" onClick={() => up({ competitors: settings.competitors.filter((x) => x.id !== c.id) })}><IconTrash size={14} /></button>
              </div>
            ))}
            <Button size="sm" variant="ghost" icon={<IconPlus size={14} />} onClick={() => up({ competitors: [...settings.competitors, { id: uid('c'), name: 'Đối thủ mới', type: 'direct' }] })}>Thêm đối thủ</Button>
          </div>
          <div className="section-title" style={{ marginTop: 14 }}>Trọng số loại đối thủ</div>
          <div className="row">
            <Num label="Direct" step={0.1} value={settings.cafWeights.direct} onChange={(v) => up({ cafWeights: { ...settings.cafWeights, direct: v } })} />
            <Num label="Indirect" step={0.1} value={settings.cafWeights.indirect} onChange={(v) => up({ cafWeights: { ...settings.cafWeights, indirect: v } })} />
          </div>
          <div className="section-title" style={{ marginTop: 14 }}>Điểm adoption</div>
          <div className="row">
            {(['no', 'basic', 'good', 'advanced'] as const).map((k) => <Num key={k} label={k[0].toUpperCase() + k.slice(1)} step={0.1} value={settings.adoptionScores[k]} onChange={(v) => up({ adoptionScores: { ...settings.adoptionScores, [k]: v } })} />)}
          </div>
          <div className="section-title" style={{ marginTop: 14 }}>Ngưỡng Implementation Phase</div>
          <div className="row">
            <Num label="Phase 1 >" value={settings.phaseThresholds.p1} onChange={(v) => up({ phaseThresholds: { ...settings.phaseThresholds, p1: v } })} />
            <Num label="Phase 2 ≥" value={settings.phaseThresholds.p2} onChange={(v) => up({ phaseThresholds: { ...settings.phaseThresholds, p2: v } })} />
            <Num label="Phase 3 ≥" value={settings.phaseThresholds.p3} onChange={(v) => up({ phaseThresholds: { ...settings.phaseThresholds, p3: v } })} />
          </div>
        </Card>

        <Card title="Sprint & vệ sinh backlog">
          <div className="row">
            <Num label="Độ dài sprint (ngày)" value={settings.sprintLengthDays} onChange={(v) => up({ sprintLengthDays: v })} />
            <Num label="Stale sau (tháng)" value={settings.staleMonths} onChange={(v) => up({ staleMonths: v })} />
          </div>
        </Card>

        <Card title="Dữ liệu demo" desc="Dữ liệu lưu trong trình duyệt (localStorage). Reset để quay về 44 issue gốc + dữ liệu demo.">
          <Button variant="danger" icon={<IconRefresh size={14} />} onClick={() => setConfirmReset(true)}>Reset dữ liệu demo</Button>
        </Card>
      </div>
      {confirmReset && (
        <Modal title="Reset dữ liệu demo?" onClose={() => setConfirmReset(false)} footer={<><Button variant="ghost" onClick={() => setConfirmReset(false)}>Huỷ</Button><Button variant="danger" onClick={() => { reset(); setConfirmReset(false); }}>Reset</Button></>}>
          Mọi thay đổi (điểm, sprint, grooming, ideas, thiết lập) sẽ mất và quay về dữ liệu ban đầu.
        </Modal>
      )}
    </div>
  );
}
