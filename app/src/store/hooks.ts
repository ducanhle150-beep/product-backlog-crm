import { useMemo } from 'react';
import { methodById, scoreIssue } from '../lib/prioritization';
import type { ScoredIssue } from '../lib/prioritization';
import { readiness } from '../lib/readiness';
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
