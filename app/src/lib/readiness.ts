// Definition of Ready, INVEST, DEEP — phần tự động suy ra từ dữ liệu, phần còn lại tick tay.
import type { Issue, Settings } from '../data/types';

export interface CheckResult {
  id: string;
  text: string;
  ok: boolean;
  auto: boolean;
  hint?: string;
}

export const unresolvedBlockers = (issue: Issue, byId: Map<string, Issue>): Issue[] =>
  issue.blockedBy.map((id) => byId.get(id)).filter((b): b is Issue => !!b && b.status !== 'done' && !b.archived);

const AUTO_DOR: Record<string, (i: Issue, byId: Map<string, Issue>) => boolean> = {
  dor1: (i) => !!i.userStory?.iWant?.trim(),
  dor2: (i) => i.acceptanceCriteria.length > 0,
  dor3: (i) => i.storyPoints !== undefined,
  dor4: (i) => i.storyPoints !== undefined && i.storyPoints <= 8,
  dor5: (i, byId) => unresolvedBlockers(i, byId).length === 0,
};

export function dorChecks(issue: Issue, settings: Settings, byId: Map<string, Issue>): CheckResult[] {
  return settings.dorItems.map((item) => {
    const auto = AUTO_DOR[item.id];
    return auto
      ? { id: item.id, text: item.text, ok: auto(issue, byId), auto: true }
      : { id: item.id, text: item.text, ok: !!issue.dor[item.id], auto: false };
  });
}

export function readiness(issue: Issue, settings: Settings, byId: Map<string, Issue>) {
  const checks = dorChecks(issue, settings, byId);
  const passed = checks.filter((c) => c.ok).length;
  return { checks, passed, total: checks.length, pct: checks.length ? Math.round((passed / checks.length) * 100) : 100, ready: passed === checks.length };
}

export const INVEST = [
  { id: 'I', name: 'Independent', text: 'Làm được độc lập, không phụ thuộc story khác' },
  { id: 'N', name: 'Negotiable', text: 'Là điểm khởi đầu để trao đổi, chưa phải hợp đồng cứng' },
  { id: 'V', name: 'Valuable', text: 'Mang giá trị rõ cho merchant/business' },
  { id: 'E', name: 'Estimable', text: 'Team estimate được' },
  { id: 'S', name: 'Small', text: 'Đủ nhỏ để xong trong 1 sprint' },
  { id: 'T', name: 'Testable', text: 'Có acceptance criteria để test' },
] as const;

export function investChecks(issue: Issue, byId: Map<string, Issue>): CheckResult[] {
  const hints: Record<string, boolean | undefined> = {
    I: issue.blockedBy.length === 0 ? undefined : unresolvedBlockers(issue, byId).length === 0,
    E: issue.storyPoints !== undefined,
    S: issue.storyPoints !== undefined ? issue.storyPoints <= 8 : undefined,
    T: issue.acceptanceCriteria.length > 0,
  };
  return INVEST.map((c) => {
    const auto = hints[c.id];
    return {
      id: c.id,
      text: `${c.name} — ${c.text}`,
      ok: auto ?? !!issue.invest[c.id],
      auto: auto !== undefined,
    };
  });
}

/** DEEP (Roman Pichler): Detailed appropriately, Estimated, Emergent, Prioritized — tính trên backlog đã sắp theo rank. */
export function deep(ordered: Issue[], hasScore: (i: Issue) => boolean, now: Date) {
  const n = ordered.length || 1;
  const top = ordered.slice(0, Math.max(5, Math.ceil(ordered.length * 0.25)));
  const detailed = top.filter((i) => i.userStory?.iWant && i.acceptanceCriteria.length > 0).length / (top.length || 1);
  const estimated = ordered.filter((i) => i.storyPoints !== undefined).length / n;
  const cutoff = now.getTime() - 30 * 86400000;
  const emergent = ordered.filter((i) => new Date(i.lastGroomedAt ?? i.updatedAt).getTime() >= cutoff).length / n;
  const prioritized = ordered.filter(hasScore).length / n;
  const parts = [
    { key: 'D', name: 'Detailed appropriately', value: detailed, hint: 'Top 25% backlog có user story + AC' },
    { key: 'E', name: 'Estimated', value: estimated, hint: 'Item đã có story point' },
    { key: 'E2', name: 'Emergent', value: emergent, hint: 'Item được tạo/refine trong 30 ngày qua' },
    { key: 'P', name: 'Prioritized', value: prioritized, hint: 'Item đã chấm điểm theo method đang dùng' },
  ];
  return { parts, overall: parts.reduce((s, p) => s + p.value, 0) / parts.length };
}
