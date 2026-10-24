import type { Issue, Settings } from '../../data/types';
import type { Classification, PrioritizationMethod } from './types';
import { saeIceCaf } from './saeIceCaf';
import { ice, rice, wsjf } from './scoring';
import { forceRank, kano, moscow, riskValue, valueEffort } from './categorical';

export * from './types';

export const METHODS: PrioritizationMethod[] = [saeIceCaf, ice, rice, wsjf, moscow, riskValue, valueEffort, kano, forceRank];

export const methodById = (id: string): PrioritizationMethod => METHODS.find((m) => m.id === id) ?? saeIceCaf;

export interface ScoredIssue {
  issue: Issue;
  score: number | null;
  cls: Classification | null;
}

export function scoreIssue(issue: Issue, method: PrioritizationMethod, settings: Settings): ScoredIssue {
  const inputs = issue.scores[method.id];
  const score = method.compute(inputs, { settings });
  return { issue, score, cls: method.classify?.(score, inputs, { settings }) ?? null };
}

/** Điểm cao trước; chưa chấm xuống cuối, giữ thứ tự rank hiện tại. */
export function rankByMethod(issues: Issue[], method: PrioritizationMethod, settings: Settings): ScoredIssue[] {
  return issues
    .map((i) => scoreIssue(i, method, settings))
    .sort((a, b) => {
      if (a.score === null && b.score === null) return a.issue.rank - b.issue.rank;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score || a.issue.rank - b.issue.rank;
    });
}

export function formatScore(method: PrioritizationMethod, score: number | null): string {
  if (score === null) return '—';
  return method.format ? method.format(score) : String(Math.round(score * 100) / 100);
}
