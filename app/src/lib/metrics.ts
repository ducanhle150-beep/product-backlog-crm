// Velocity, burndown, health scorecard.
import { addDays, differenceInCalendarDays, format, parseISO } from 'date-fns';
import type { Issue, Sprint } from '../data/types';

export const points = (issues: Issue[]) => issues.reduce((s, i) => s + (i.storyPoints ?? 0), 0);

export function sprintIssues(sprint: Sprint, issues: Issue[]) {
  return issues.filter((i) => i.sprintId === sprint.id && !i.archived);
}

export function sprintTotals(sprint: Sprint, issues: Issue[]) {
  const items = sprintIssues(sprint, issues);
  const computedCommitted = points(items);
  const computedDone = points(items.filter((i) => i.status === 'done'));
  return {
    committed: sprint.committedPoints ?? computedCommitted,
    completed: sprint.completedPoints ?? computedDone,
    items,
  };
}

export function velocitySeries(sprints: Sprint[], issues: Issue[]) {
  return sprints
    .filter((s) => s.state !== 'planned')
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .map((s) => {
      const t = sprintTotals(s, issues);
      return { name: s.name.replace('FRA ', ''), committed: t.committed, completed: t.completed, active: s.state === 'active' };
    });
}

export function averageVelocity(sprints: Sprint[], issues: Issue[], lastN = 3) {
  const done = velocitySeries(sprints, issues).filter((v) => !v.active).slice(-lastN);
  return done.length ? Math.round(done.reduce((s, v) => s + v.completed, 0) / done.length) : 0;
}

/** Burndown: scope ban đầu (trừ item thêm sau start), ideal tuyến tính, actual tới hôm nay. */
export function burndown(sprint: Sprint, issues: Issue[], today: Date) {
  const items = sprintIssues(sprint, issues);
  const start = parseISO(sprint.startDate), end = parseISO(sprint.endDate);
  const days = differenceInCalendarDays(end, start);
  const addedAt = new Map(sprint.scopeChanges.filter((c) => c.delta > 0).map((c) => [c.issueId, parseISO(c.at)]));
  const initialScope = points(items.filter((i) => !addedAt.has(i.id)));
  const rows = [];
  for (let d = 0; d <= days; d++) {
    const day = addDays(start, d);
    const endOfDay = addDays(day, 1);
    const inScope = items.filter((i) => (addedAt.get(i.id) ?? start) < endOfDay);
    const doneBy = inScope.filter((i) => i.doneAt && parseISO(i.doneAt) < endOfDay);
    rows.push({
      day: format(day, 'MMM d'),
      ideal: Math.round((initialScope * (1 - d / days)) * 10) / 10,
      remaining: day <= today ? points(inScope) - points(doneBy) : null,
      scope: day <= today ? points(inScope) : null,
    });
  }
  return { rows, initialScope };
}

export function isStale(issue: Issue, months: number, now: Date) {
  const last = new Date(issue.lastGroomedAt ?? issue.updatedAt);
  return now.getTime() - last.getTime() > months * 30 * 86400000;
}
