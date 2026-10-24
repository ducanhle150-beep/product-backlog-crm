// SAE - Backlog - MIDA Heatmap - Methodology: hybrid ICE × Competitor Adoption Factor.
import type { Settings } from '../../data/types';
import type { Classification, Inputs, PrioritizationMethod } from './types';
import { num, scale } from './types';

export type Adoption = 'no' | 'basic' | 'good' | 'advanced';

export const ADOPTION_LABEL: Record<Adoption, string> = {
  no: 'No',
  basic: 'Basic / Limited',
  good: 'Good / Yes',
  advanced: 'Advanced',
};

export function computeIce(inputs: Inputs | undefined): number | null {
  const i = num(inputs?.impact), c = num(inputs?.confidence), e = num(inputs?.ease);
  if (i === null || c === null || e === null) return null;
  return i * c * e;
}

/** CAF = Σ(AdoptionScore_i × Weight_i) / Σ Weight_i — chỉ tính đối thủ đã chấm adoption; không có → 0. */
export function computeCaf(inputs: Inputs | undefined, settings: Settings): number {
  const adoption = (inputs?.adoption ?? {}) as Record<string, Adoption | undefined>;
  let weighted = 0, weights = 0;
  for (const c of settings.competitors) {
    const a = adoption[c.id];
    if (!a) continue;
    const w = settings.cafWeights[c.type];
    weighted += settings.adoptionScores[a] * w;
    weights += w;
  }
  return weights === 0 ? 0 : weighted / weights;
}

export function phaseOf(score: number, settings: Settings): Classification {
  const { p1, p2, p3 } = settings.phaseThresholds;
  if (score > p1) return { label: 'Phase 1 · High', color: '#22c55e', order: 1 };
  if (score >= p2) return { label: 'Phase 2 · Medium', color: '#3b82f6', order: 2 };
  if (score >= p3) return { label: 'Phase 3 · Low', color: '#f59e0b', order: 3 };
  return { label: 'Phase 4 · Niche', color: '#8a8a8a', order: 4 };
}

export const PHASE_MEANING: Record<number, string> = {
  1: 'Build immediately – high impact & adoption.',
  2: 'Core expectations – implement next quarter.',
  3: 'Nice-to-have – plan if resources available.',
  4: 'Niche/advanced – keep in backlog until demand arises.',
};

export const saeIceCaf: PrioritizationMethod = {
  id: 'sae-ice-caf',
  name: 'SAE ICE × CAF',
  short: 'ICE×CAF',
  source: 'SAE - Backlog - MIDA Heatmap - Methodology',
  description:
    'Hybrid scoring: ICE (giá trị cho merchant) kết hợp Competitor Adoption Factor (áp lực thị trường) — vừa tạo khác biệt vừa đạt competitive parity.',
  formula: 'ICE = I × C × E · CAF = Σ(adoption × weight) / Σ weight · Final = ICE × (1 + CAF)',
  fields: [
    { key: 'impact', label: 'Impact', kind: 'select', options: scale(1, 10), hint: 'Giá trị với merchant (conversion, retention, satisfaction).' },
    { key: 'confidence', label: 'Confidence', kind: 'select', options: scale(1, 10), hint: 'Mức chắc chắn về Impact (adoption đối thủ, feedback khách, validation nội bộ).' },
    { key: 'ease', label: 'Ease', kind: 'select', options: scale(1, 10), hint: 'Độ dễ triển khai (độ phức tạp kỹ thuật, nguồn lực).' },
  ],
  special: 'competitors',
  visual: 'phase',
  compute(inputs, { settings }) {
    const ice = computeIce(inputs);
    if (ice === null) return null;
    return ice * (1 + computeCaf(inputs, settings));
  },
  classify(score, _inputs, { settings }) {
    return score === null ? null : phaseOf(score, settings);
  },
  format: (s) => (Math.round(s * 10) / 10).toLocaleString('en-US'),
};
