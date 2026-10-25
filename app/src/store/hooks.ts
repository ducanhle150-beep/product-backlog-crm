import { useMemo } from 'react';
import { methodById, scoreIssue } from '../lib/prioritization';
import type { ScoredIssue } from '../lib/prioritization';
import { readiness, unresolvedBlockers } from '../lib/readiness';
import { STALE_MONTHS, averageVelocity, isStale } from '../lib/metrics';
import type { Issue } from '../data/types';
import { useStore } from './useStore';

/** Method đang dùng + hàm chấm điểm/readiness cho 1 issue. */
export function useScoring() {
  const settings = useStore((s) => s.settings);
  const issues = useStore((s) => s.issues);
  const method = methodById(settings.activeMethod);
  const byId = useMemo(() => new Map(issues.map((i) => [i.id, i])), [issues]);
  return {
    method,
    settings,
    byId,
    score: (i: Issue): ScoredIssue => scoreIssue(i, method, settings),
    ready: (i: Issue) => readiness(i, settings, byId),
  };
}

/** Backlog item (chưa sang Bảng) chưa thuộc sprint nào, theo rank. */
export function useBacklogIssues() {
  const issues = useStore((s) => s.issues);
  return useMemo(() => issues.filter((i) => i.kind === 'backlog' && !i.archived && !i.sprintId).sort((a, b) => a.rank - b.rank), [issues]);
}

/** Item cần refine: top backlog đủ ~3 sprint (theo velocity) chưa đạt DoR. */
export function useNeedsRefinement() {
  const backlog = useBacklogIssues();
  const sprints = useStore((s) => s.sprints);
  const issues = useStore((s) => s.issues);
  const { ready } = useScoring();
  const horizon = (averageVelocity(sprints, issues) || 30) * 3;
  let acc = 0;
  const top: Issue[] = [];
  for (const i of backlog) {
    if (acc > horizon) break;
    acc += i.storyPoints ?? 3;
    top.push(i);
  }
  return { top, notReady: top.filter((i) => !ready(i).ready), horizon };
}

export interface HealthFilter {
  id: string;
  label: string;
  test(i: Issue): boolean;
}

/** Nhóm item "cần chú ý" — Insights đếm, Danh sách lọc theo cùng một định nghĩa. */
export function useHealthFilters(): Record<string, HealthFilter> {
  const { method, score, ready, byId } = useScoring();
  const { top } = useNeedsRefinement();
  const topIds = new Set(top.map((i) => i.id));
  const now = new Date();
  const list: HealthFilter[] = [
    { id: 'not-ready-top', label: 'Top backlog chưa đạt DoR', test: (i) => topIds.has(i.id) && !ready(i).ready },
    { id: 'unscored', label: `Chưa chấm ${method.name}`, test: (i) => score(i).score === null },
    { id: 'no-goal', label: 'Không gắn strategic goal', test: (i) => !i.goalId },
    { id: 'no-why', label: 'Thiếu "why now"', test: (i) => !i.whyNow.trim() },
    { id: 'low-tier', label: `Nhóm ưu tiên thấp (${method.name})`, test: (i) => (score(i).cls?.order ?? 0) >= 3 },
    { id: 'stale', label: `Không động tới > ${STALE_MONTHS} tháng`, test: (i) => isStale(i, STALE_MONTHS, now) },
    { id: 'unestimated', label: 'Chưa estimate', test: (i) => i.storyPoints === undefined },
    { id: 'oversized', label: 'Lớn hơn 8 pt', test: (i) => (i.storyPoints ?? 0) > 8 },
    { id: 'blocked', label: 'Bị block bởi dependency', test: (i) => unresolvedBlockers(i, byId).length > 0 },
  ];
  return Object.fromEntries(list.map((f) => [f.id, f]));
}
