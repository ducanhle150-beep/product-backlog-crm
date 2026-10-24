// Các method dạng phân loại/ma trận: MoSCoW, Risk/Value, Value vs Effort, Kano, 20/20.
import type { Settings } from '../../data/types';
import type { Classification, Inputs, PrioritizationMethod } from './types';
import { num, scale } from './types';

export type MoscowBucket = 'M' | 'S' | 'C' | 'W';

export const MOSCOW: Record<MoscowBucket, { label: string; color: string; order: number }> = {
  M: { label: 'Must have', color: '#22c55e', order: 1 },
  S: { label: 'Should have', color: '#3b82f6', order: 2 },
  C: { label: 'Could have', color: '#f59e0b', order: 3 },
  W: { label: "Won't have", color: '#8a8a8a', order: 4 },
};

const moscowOptions = (Object.keys(MOSCOW) as MoscowBucket[]).map((k) => ({ value: k, label: `${k} · ${MOSCOW[k].label}` }));

function votesOf(inputs: Inputs | undefined): Record<string, MoscowBucket> {
  return (inputs?.votes ?? {}) as Record<string, MoscowBucket>;
}

export function moscowTotal(inputs: Inputs | undefined, settings: Settings): number | null {
  const votes = Object.values(votesOf(inputs));
  if (votes.length) return votes.reduce((s, v) => s + settings.moscowPoints[v], 0);
  const label = inputs?.label as MoscowBucket | undefined;
  return label ? settings.moscowPoints[label] : null;
}

export const moscow: PrioritizationMethod = {
  id: 'moscow',
  name: 'MoSCoW',
  short: 'MoSCoW',
  source: 'Backlog Prioritization Techniques (slide 3–4)',
  description:
    'Must / Should / Could / Won\'t thay cho High/Med/Low. Option 1: thống nhất 1 nhãn. Option 2: từng stakeholder vote, cộng điểm (M=10, S=7, C=3, W=0). Must (+Should) = MVP.',
  formula: 'Total = Σ điểm vote của stakeholder (hoặc điểm của nhãn thống nhất)',
  fields: [{ key: 'label', label: 'Nhãn thống nhất', kind: 'select', options: moscowOptions }],
  special: 'votes',
  visual: 'votes',
  compute: (inputs, { settings }) => moscowTotal(inputs, settings),
  classify(_score, inputs, { settings }) {
    const label = inputs?.label as MoscowBucket | undefined;
    if (label) return MOSCOW[label];
    const votes = Object.values(votesOf(inputs));
    if (!votes.length) return null;
    const avg = votes.reduce((s, v) => s + settings.moscowPoints[v], 0) / votes.length;
    const p = settings.moscowPoints;
    const bucket: MoscowBucket = avg >= (p.M + p.S) / 2 ? 'M' : avg >= (p.S + p.C) / 2 ? 'S' : avg >= (p.C + p.W) / 2 ? 'C' : 'W';
    return MOSCOW[bucket];
  },
};

/** Cảnh báo từ slide 4: item hoà điểm, stakeholder vote mọi item như nhau. */
export function analyzeMoscowVotes(items: { id: string; inputs: Inputs | undefined }[], settings: Settings) {
  const totals = new Map<number, string[]>();
  const byVoter = new Map<string, Set<MoscowBucket>>();
  for (const it of items) {
    const votes = votesOf(it.inputs);
    if (!Object.keys(votes).length) continue;
    const t = moscowTotal(it.inputs, settings)!;
    totals.set(t, [...(totals.get(t) ?? []), it.id]);
    for (const [voter, v] of Object.entries(votes)) {
      byVoter.set(voter, (byVoter.get(voter) ?? new Set()).add(v));
    }
  }
  const ties = [...totals.entries()].filter(([, ids]) => ids.length > 1).map(([total, ids]) => ({ total, ids }));
  const flatVoters = [...byVoter.entries()].filter(([, s]) => s.size === 1).map(([voter]) => voter);
  return { ties, flatVoters };
}

// ---------- Risk / Value (Mike Cohn, slide 7–8) ----------
export function riskValueQuadrant(value: number, risk: number) {
  const hv = value > 5, hr = risk > 5;
  if (hr && hv) return { order: 1, label: '1 · High risk / High value', color: '#22c55e', moscow: 'Must-Have' };
  if (!hr && hv) return { order: 2, label: '2 · Low risk / High value', color: '#86efac', moscow: 'Must / Should' };
  if (!hr && !hv) return { order: 3, label: '3 · Low risk / Low value', color: '#f59e0b', moscow: 'Should / Could' };
  return { order: 4, label: '? · High risk / Low value', color: '#ef4444', moscow: "Won't-Have" };
}

export const RISK_TYPES = [
  { value: 'schedule', label: 'Schedule — có thể không kịp' },
  { value: 'cost', label: 'Cost — tốn hơn dự kiến' },
  { value: 'business', label: 'Functionality — workflow có thể sai' },
  { value: 'technical', label: 'Technical — có thể không đạt hiệu năng' },
];

export const riskValue: PrioritizationMethod = {
  id: 'risk-value',
  name: 'Risk / Value',
  short: 'Risk/Value',
  source: 'Backlog Prioritization Techniques (slide 7–8)',
  description:
    'Chấm Value và Risk. Scrum: làm High risk/High value trước, Low risk/High value là quick wins, High risk/Low value để ngoài MVP.',
  formula: 'Quadrant (ngưỡng > 5): 1 HR/HV → 2 LR/HV → 3 LR/LV → ? HR/LV',
  fields: [
    { key: 'value', label: 'Value', kind: 'select', options: scale(1, 10) },
    { key: 'risk', label: 'Risk', kind: 'select', options: scale(1, 10) },
    { key: 'riskType', label: 'Loại risk', kind: 'select', options: RISK_TYPES },
  ],
  visual: 'matrix',
  compute(inputs) {
    const v = num(inputs?.value), r = num(inputs?.risk);
    if (v === null || r === null) return null;
    const q = riskValueQuadrant(v, r);
    return (5 - q.order) * 100 + v * 10 + (q.order === 1 ? r : 10 - r);
  },
  classify(_s, inputs) {
    const v = num(inputs?.value), r = num(inputs?.risk);
    if (v === null || r === null) return null;
    const q = riskValueQuadrant(v, r);
    return { label: q.label, color: q.color, order: q.order };
  },
  format: () => '',
};

// ---------- Value vs Effort ----------
export function valueEffortQuadrant(value: number, effort: number): Classification {
  const hv = value > 5, he = effort > 5;
  if (hv && !he) return { label: 'Quick win', color: '#22c55e', order: 1 };
  if (hv && he) return { label: 'Big bet', color: '#3b82f6', order: 2 };
  if (!hv && !he) return { label: 'Fill-in', color: '#f59e0b', order: 3 };
  return { label: 'Time sink', color: '#ef4444', order: 4 };
}

export const valueEffort: PrioritizationMethod = {
  id: 'value-effort',
  name: 'Value vs Effort',
  short: 'Value/Effort',
  source: 'Framework 2×2 phổ biến (ngoài PDF)',
  description: 'Ma trận 2×2: Quick wins (giá trị cao, công sức thấp) → Big bets → Fill-ins → Time sinks.',
  formula: 'Score = Value ÷ Effort · Quadrant ngưỡng > 5',
  fields: [
    { key: 'value', label: 'Value', kind: 'select', options: scale(1, 10) },
    { key: 'effort', label: 'Effort', kind: 'select', options: scale(1, 10) },
  ],
  visual: 'matrix',
  compute(inputs) {
    const v = num(inputs?.value), e = num(inputs?.effort);
    return v === null || e === null ? null : v / e;
  },
  classify(_s, inputs) {
    const v = num(inputs?.value), e = num(inputs?.effort);
    return v === null || e === null ? null : valueEffortQuadrant(v, e);
  },
  format: (s) => s.toFixed(2),
};

// ---------- Kano ----------
export type KanoAnswer = 'like' | 'expect' | 'neutral' | 'tolerate' | 'dislike';
export type KanoCategory = 'must' | 'performance' | 'attractive' | 'indifferent' | 'reverse' | 'questionable';

export const KANO: Record<KanoCategory, Classification & { desc: string; weight: number }> = {
  must: { label: 'Must-be', color: '#ef4444', order: 1, weight: 4, desc: 'Thiếu thì merchant bất mãn, có cũng không làm họ vui hơn.' },
  performance: { label: 'Performance', color: '#3b82f6', order: 2, weight: 3, desc: 'Càng tốt càng hài lòng (tuyến tính).' },
  attractive: { label: 'Attractive', color: '#22c55e', order: 3, weight: 2, desc: 'Delighter — bất ngờ, tạo khác biệt.' },
  indifferent: { label: 'Indifferent', color: '#8a8a8a', order: 4, weight: 1, desc: 'Merchant không quan tâm.' },
  reverse: { label: 'Reverse', color: '#a855f7', order: 5, weight: 0, desc: 'Có tính năng lại khiến merchant khó chịu.' },
  questionable: { label: 'Questionable', color: '#666', order: 6, weight: 0, desc: 'Câu trả lời mâu thuẫn — hỏi lại.' },
};

const ANSWERS: KanoAnswer[] = ['like', 'expect', 'neutral', 'tolerate', 'dislike'];
// Bảng đánh giá Kano chuẩn: hàng = câu trả lời functional, cột = dysfunctional.
const KANO_TABLE: KanoCategory[][] = [
  ['questionable', 'attractive', 'attractive', 'attractive', 'performance'],
  ['reverse', 'indifferent', 'indifferent', 'indifferent', 'must'],
  ['reverse', 'indifferent', 'indifferent', 'indifferent', 'must'],
  ['reverse', 'indifferent', 'indifferent', 'indifferent', 'must'],
  ['reverse', 'reverse', 'reverse', 'reverse', 'questionable'],
];

export function kanoCategory(inputs: Inputs | undefined): KanoCategory | null {
  const f = inputs?.functional as KanoAnswer | undefined, d = inputs?.dysfunctional as KanoAnswer | undefined;
  if (f && d) return KANO_TABLE[ANSWERS.indexOf(f)][ANSWERS.indexOf(d)];
  return (inputs?.category as KanoCategory | undefined) ?? null;
}

const answerOptions = [
  { value: 'like', label: 'Thích' }, { value: 'expect', label: 'Đương nhiên phải có' },
  { value: 'neutral', label: 'Trung lập' }, { value: 'tolerate', label: 'Chấp nhận được' }, { value: 'dislike', label: 'Không thích' },
];

export const kano: PrioritizationMethod = {
  id: 'kano',
  name: 'Kano',
  short: 'Kano',
  source: 'Kano model (ngoài PDF)',
  description:
    'Phân loại theo mức hài lòng của merchant. Hỏi 2 câu: "Nếu có tính năng này bạn thấy sao?" (functional) và "Nếu không có?" (dysfunctional) → tra bảng Kano. Hoặc chọn thẳng category.',
  formula: 'Ưu tiên: Must-be → Performance → Attractive → Indifferent',
  fields: [
    { key: 'functional', label: 'Nếu CÓ', kind: 'select', options: answerOptions },
    { key: 'dysfunctional', label: 'Nếu KHÔNG có', kind: 'select', options: answerOptions },
    {
      key: 'category', label: 'Category (thủ công)', kind: 'select',
      options: (['must', 'performance', 'attractive', 'indifferent', 'reverse'] as KanoCategory[]).map((k) => ({ value: k, label: KANO[k].label })),
    },
  ],
  visual: 'kano',
  compute(inputs) {
    const c = kanoCategory(inputs);
    return c ? KANO[c].weight : null;
  },
  classify(_s, inputs) {
    const c = kanoCategory(inputs);
    return c ? KANO[c] : null;
  },
  format: () => '',
};

// ---------- 20/20 force-rank ----------
export const forceRank: PrioritizationMethod = {
  id: 'force-rank',
  name: '20/20 Force-rank',
  short: '20/20',
  source: 'Backlog Prioritization Techniques (slide 5–6)',
  description:
    'So sánh từng cặp như khám mắt ("A hay B rõ hơn?"). Luôn bắt đầu từ đầu danh sách, chỉ so 2 item một lúc; cần facilitator để thương lượng.',
  formula: 'Insertion sort bằng so sánh cặp → thứ hạng 1..n',
  fields: [],
  special: 'pairwise',
  visual: 'rank',
  compute(inputs) {
    const r = num(inputs?.rank);
    return r === null ? null : 10000 - r;
  },
  format: (s) => `#${10000 - s}`,
};
