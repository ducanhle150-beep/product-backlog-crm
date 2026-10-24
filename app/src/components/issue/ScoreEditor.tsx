import type { Issue } from '../../data/types';
import { useStore } from '../../store/useStore';
import type { FieldDef, PrioritizationMethod } from '../../lib/prioritization';
import { formatScore, scoreIssue } from '../../lib/prioritization';
import { ADOPTION_LABEL, computeCaf, computeIce, PHASE_MEANING } from '../../lib/prioritization/saeIceCaf';
import type { Adoption } from '../../lib/prioritization/saeIceCaf';
import { MOSCOW } from '../../lib/prioritization/categorical';
import type { MoscowBucket } from '../../lib/prioritization/categorical';

export function FieldInput({ field, value, onChange }: { field: FieldDef; value: unknown; onChange(v: unknown): void }) {
  if (field.kind === 'select') {
    return (
      <select
        className="select"
        style={{ width: field.width }}
        value={value === undefined ? '' : String(value)}
        title={field.hint}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') return onChange(undefined);
          const opt = field.options!.find((o) => String(o.value) === raw)!;
          onChange(opt.value);
        }}
      >
        <option value="">—</option>
        {field.options!.map((o) => <option key={String(o.value)} value={String(o.value)}>{o.label}</option>)}
      </select>
    );
  }
  return (
    <input
      className="input"
      type="number"
      style={{ width: field.width ?? 80 }}
      min={field.min}
      step={field.step}
      title={field.hint}
      value={typeof value === 'number' ? value : ''}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
    />
  );
}

/** Form đầy đủ cho 1 method trên 1 issue (dùng trong drawer + panel chi tiết tab Ưu tiên). */
export function ScoreEditor({ issue, method }: { issue: Issue; method: PrioritizationMethod }) {
  const settings = useStore((s) => s.settings);
  const setScore = useStore((s) => s.setScore);
  const updateIssue = useStore((s) => s.updateIssue);
  const inputs = (issue.scores[method.id] ?? {}) as Record<string, unknown>;
  const set = (key: string, v: unknown) => setScore(issue.id, method.id, { ...inputs, [key]: v });
  const { score, cls } = scoreIssue(issue, method, settings);

  return (
    <div className="score-editor">
      <div className="score-editor__fields">
        {method.fields.map((f) => (
          <label key={f.key} className="field">
            <span title={f.hint}>{f.label}</span>
            <FieldInput field={f} value={inputs[f.key]} onChange={(v) => set(f.key, v)} />
          </label>
        ))}
      </div>

      {method.special === 'competitors' && (
        <div className="score-editor__block">
          <div className="section-title">Competitor adoption</div>
          {settings.competitors.map((c) => {
            const adoption = (inputs.adoption ?? {}) as Record<string, Adoption | undefined>;
            return (
              <div key={c.id} className="row" style={{ marginBottom: 6 }}>
                <span className="grow truncate">{c.name}</span>
                <span className="muted small" style={{ width: 92 }}>{c.type === 'direct' ? 'Direct ×1.5' : 'Indirect ×1.0'}</span>
                <select
                  className="select"
                  value={adoption[c.id] ?? ''}
                  onChange={(e) => set('adoption', { ...adoption, [c.id]: (e.target.value || undefined) as Adoption | undefined })}
                >
                  <option value="">Chưa research</option>
                  {(Object.keys(ADOPTION_LABEL) as Adoption[]).map((a) => (
                    <option key={a} value={a}>{ADOPTION_LABEL[a]} ({settings.adoptionScores[a]})</option>
                  ))}
                </select>
              </div>
            );
          })}
          <div className="muted small">
            ICE = {computeIce(inputs) ?? '—'} · CAF = {computeCaf(inputs, settings).toFixed(3)} (+{Math.round(computeCaf(inputs, settings) * 100)}% competitor boost)
          </div>
        </div>
      )}

      {method.special === 'votes' && (
        <div className="score-editor__block">
          <div className="section-title">Stakeholder vote (Option 2)</div>
          {settings.stakeholders.map((sh) => {
            const votes = (inputs.votes ?? {}) as Record<string, MoscowBucket | undefined>;
            return (
              <div key={sh.id} className="row" style={{ marginBottom: 6 }}>
                <span className="grow">{sh.name}</span>
                <div className="seg seg--sm">
                  {(Object.keys(MOSCOW) as MoscowBucket[]).map((b) => (
                    <button
                      key={b}
                      className={votes[sh.id] === b ? 'is-active' : ''}
                      style={votes[sh.id] === b ? { color: MOSCOW[b].color } : undefined}
                      onClick={() => {
                        const next = { ...votes, [sh.id]: votes[sh.id] === b ? undefined : b };
                        Object.keys(next).forEach((k) => next[k] === undefined && delete next[k]);
                        set('votes', next);
                      }}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="score-editor__result">
        <span className="muted">Kết quả</span>
        <strong style={{ color: cls?.color }}>{score === null ? 'Chưa đủ input' : formatScore(method, score) || cls?.label}</strong>
        {cls && formatScore(method, score) && <span style={{ color: cls.color }}>{cls.label}</span>}
        {method.id === 'sae-ice-caf' && cls && <span className="muted small">— {PHASE_MEANING[cls.order]}</span>}
      </div>
      <label className="field" style={{ marginTop: 10 }}>
        <span>Score reasoning</span>
        <textarea
          className="textarea"
          rows={2}
          value={issue.scoreReasoning}
          placeholder="Vì sao chấm như vậy? (dữ liệu, feedback khách, đối thủ…)"
          onChange={(e) => updateIssue(issue.id, { scoreReasoning: e.target.value })}
        />
      </label>
    </div>
  );
}
