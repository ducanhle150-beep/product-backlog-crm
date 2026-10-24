import type { Settings } from '../../data/types';

export type Inputs = Record<string, unknown>;

export interface FieldOption {
  value: string | number;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  kind: 'number' | 'select';
  min?: number;
  max?: number;
  step?: number;
  options?: FieldOption[];
  hint?: string;
  width?: number;
}

export interface Classification {
  label: string;
  color: string;
  order: number; // dùng để nhóm/sắp xếp bucket
}

export interface MethodContext {
  settings: Settings;
}

export interface PrioritizationMethod {
  id: string;
  name: string;
  short: string;
  source: string; // tài liệu gốc
  description: string;
  formula: string;
  fields: FieldDef[];
  /** Editor đặc biệt ngoài fields (đối thủ CAF, vote stakeholder, so sánh cặp). */
  special?: 'competitors' | 'votes' | 'pairwise';
  visual: 'phase' | 'matrix' | 'votes' | 'kano' | 'rank' | 'bar';
  compute(inputs: Inputs | undefined, ctx: MethodContext): number | null;
  classify?(score: number | null, inputs: Inputs | undefined, ctx: MethodContext): Classification | null;
  format?(score: number): string;
}

export const num = (v: unknown): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

export const scale = (min: number, max: number): FieldOption[] =>
  Array.from({ length: max - min + 1 }, (_, i) => ({ value: min + i, label: String(min + i) }));
