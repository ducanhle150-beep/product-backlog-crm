// Các method chấm điểm dạng công thức: ICE, RICE, WSJF.
import type { PrioritizationMethod } from './types';
import { num, scale } from './types';
import { computeIce } from './saeIceCaf';

const FIB = [1, 2, 3, 5, 8, 13, 20].map((v) => ({ value: v, label: String(v) }));

export const ice: PrioritizationMethod = {
  id: 'ice',
  name: 'ICE',
  short: 'ICE',
  source: 'SAE Methodology (phần 1)',
  description: 'Impact × Confidence × Ease, mỗi chiều 1–10. Là SAE ICE × CAF khi bỏ yếu tố đối thủ.',
  formula: 'Score = I × C × E (1–1000)',
  fields: [
    { key: 'impact', label: 'Impact', kind: 'select', options: scale(1, 10) },
    { key: 'confidence', label: 'Confidence', kind: 'select', options: scale(1, 10) },
    { key: 'ease', label: 'Ease', kind: 'select', options: scale(1, 10) },
  ],
  visual: 'bar',
  compute: (inputs) => computeIce(inputs),
};

export const rice: PrioritizationMethod = {
  id: 'rice',
  name: 'RICE',
  short: 'RICE',
  source: 'Intercom (framework phổ biến, ngoài PDF)',
  description: 'Reach × Impact × Confidence ÷ Effort — ưu tiên theo số merchant được tác động trên mỗi đơn vị công sức.',
  formula: 'Score = Reach × Impact × Confidence% ÷ Effort',
  fields: [
    { key: 'reach', label: 'Reach', kind: 'number', min: 0, step: 10, hint: 'Số merchant bị tác động mỗi quý.', width: 80 },
    {
      key: 'impact', label: 'Impact', kind: 'select',
      options: [
        { value: 3, label: '3 · Massive' }, { value: 2, label: '2 · High' }, { value: 1, label: '1 · Medium' },
        { value: 0.5, label: '0.5 · Low' }, { value: 0.25, label: '0.25 · Minimal' },
      ],
    },
    {
      key: 'confidence', label: 'Confidence', kind: 'select',
      options: [{ value: 100, label: '100%' }, { value: 80, label: '80%' }, { value: 50, label: '50%' }],
    },
    { key: 'effort', label: 'Effort', kind: 'number', min: 0.5, step: 0.5, hint: 'Person-months.', width: 70 },
  ],
  visual: 'bar',
  compute(inputs) {
    const r = num(inputs?.reach), i = num(inputs?.impact), c = num(inputs?.confidence), e = num(inputs?.effort);
    if (r === null || i === null || c === null || e === null || e <= 0) return null;
    return (r * i * (c / 100)) / e;
  },
  format: (s) => (Math.round(s * 10) / 10).toLocaleString('en-US'),
};

export const wsjf: PrioritizationMethod = {
  id: 'wsjf',
  name: 'WSJF',
  short: 'WSJF',
  source: 'Backlog Prioritization Techniques (slide 9–14)',
  description:
    'Weighted Shortest Job First: Cost of Delay chia Job Size. Chấm tương đối từng cột một (item kém quan trọng nhất = 1). Job Size là độ phức tạp, không phải thời gian; rủi ro cộng thêm vào Job Size.',
  formula: 'CoD = Business Value + Time Criticality + RROE · WSJF = CoD ÷ (Job Size + Risk)',
  fields: [
    { key: 'bv', label: 'Business Value', kind: 'select', options: FIB, hint: 'Revenue Growth, Business Strategy, Cost-Savings, Customer Satisfaction.' },
    { key: 'tc', label: 'Time Criticality', kind: 'select', options: FIB, hint: 'Financial targets, sự kiện, integration, system retirement…' },
    { key: 'rroe', label: 'RROE', kind: 'select', options: FIB, hint: 'Risk Reduction / Opportunity Enablement: market penetration, quality, scalability, partnerships.' },
    { key: 'jobSize', label: 'Job Size', kind: 'select', options: FIB, hint: 'Độ phức tạp tương đối, team cùng ước lượng.' },
    { key: 'risk', label: '+Risk', kind: 'select', options: [0, 1, 2, 3, 5].map((v) => ({ value: v, label: `+${v}` })), hint: 'Điểm rủi ro cộng vào Job Size.' },
  ],
  visual: 'bar',
  compute(inputs) {
    const bv = num(inputs?.bv), tc = num(inputs?.tc), rr = num(inputs?.rroe), js = num(inputs?.jobSize);
    if (bv === null || tc === null || rr === null || js === null) return null;
    const size = js + (num(inputs?.risk) ?? 0);
    return size > 0 ? (bv + tc + rr) / size : null;
  },
  format: (s) => s.toFixed(2),
};
