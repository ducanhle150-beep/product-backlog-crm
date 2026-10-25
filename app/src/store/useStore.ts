import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  Epic, GroomingLogEntry, GroomingSession, Idea, Issue, Settings, Sprint,
} from '../data/types';
import { DEFAULT_SETTINGS, EPICS, GROOMING, IDEAS, SPRINTS, buildIssues } from '../data/seed';

const nowIso = () => new Date().toISOString();
const uid = (p: string) => `${p}${Math.random().toString(36).slice(2, 9)}`;
const clone = <T,>(v: T): T => structuredClone(v);

interface Data {
  issues: Issue[];
  epics: Epic[];
  sprints: Sprint[];
  sessions: GroomingSession[];
  ideas: Idea[];
  settings: Settings;
}

const seed = (): Data => {
  const settings = clone(DEFAULT_SETTINGS);
  return {
    issues: buildIssues(settings),
    epics: clone(EPICS),
    sprints: clone(SPRINTS),
    sessions: clone(GROOMING),
    ideas: clone(IDEAS),
    settings,
  };
};

export interface Store extends Data {
  selectedIssueId: string | null;
  /** Chỉ mở panel cho backlog item — task trên Bảng không có panel. */
  openIssue(id: string | null): void;

  updateIssue(id: string, patch: Partial<Issue>, activity?: string): void;
  setScore(id: string, methodId: string, inputs: Record<string, unknown>): void;
  createIssue(patch: Partial<Issue> & { title: string }): Issue;
  /** Gán lại rank cho tập id theo thứ tự mới, giữ nguyên các "slot" rank cũ của chúng. */
  reorder(orderedIds: string[]): void;
  archiveIssue(id: string): void;
  splitIssue(id: string, titles: string[], toEpic: boolean): void;

  createSprint(patch?: Partial<Sprint>): Sprint;
  updateSprint(id: string, patch: Partial<Sprint>): void;
  moveToSprint(issueId: string, sprintId: string | undefined): void;
  /** Backlog item → task trên Bảng (cột PLANNED, vào sprint đang chạy nếu có). */
  pushToBoard(issueId: string): void;
  startSprint(id: string): void;
  completeSprint(id: string, carry: Record<string, 'next' | 'backlog'>): void;

  createSession(patch?: Partial<GroomingSession>): GroomingSession;
  updateSession(id: string, patch: Partial<GroomingSession>): void;
  logSession(id: string, entry: Omit<GroomingLogEntry, 'at'>): void;

  createIdea(patch: Partial<Idea> & { title: string }): void;
  updateIdea(id: string, patch: Partial<Idea>): void;
  promoteIdea(id: string): void;

  updateSettings(patch: Partial<Settings>): void;
  createEpic(name: string): Epic;
  reset(): void;
}

const withActivity = (issue: Issue, text?: string): Issue =>
  text ? { ...issue, activity: [...issue.activity, { at: nowIso(), text }] } : issue;

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...seed(),
      selectedIssueId: null,
      openIssue: (id) => {
        if (id && get().issues.find((i) => i.id === id)?.kind === 'task') return;
        set({ selectedIssueId: id });
      },

      updateIssue: (id, patch, activity) =>
        set((s) => ({
          issues: s.issues.map((i) => {
            if (i.id !== id) return i;
            const next = { ...i, ...patch, updatedAt: nowIso() };
            if (patch.status === 'done' && i.status !== 'done') next.doneAt = nowIso();
            if (patch.status && patch.status !== 'done') next.doneAt = undefined;
            return withActivity(next, activity);
          }),
        })),

      setScore: (id, methodId, inputs) =>
        set((s) => ({
          issues: s.issues.map((i) => (i.id === id ? { ...i, scores: { ...i.scores, [methodId]: inputs }, updatedAt: nowIso() } : i)),
        })),

      createIssue: (patch) => {
        const s = get();
        const num = Math.max(...s.issues.map((i) => i.num)) + 1;
        const maxRank = Math.max(0, ...s.issues.map((i) => i.rank));
        const issue: Issue = {
          id: `i${num}`, key: `FRAUD_F-${num}`, num, kind: 'backlog', type: 'story', status: 'backlog', priority: 'medium',
          labelIds: [], createdAt: nowIso(), updatedAt: nowIso(), rank: maxRank + 1000, description: '',
          acceptanceCriteria: [], dor: {}, dod: {}, invest: {}, blockedBy: [], whyNow: '', successMetric: '',
          scores: {}, scoreReasoning: '', votes: [], activity: [{ at: nowIso(), text: 'Tạo issue' }],
          ...patch,
        };
        set({ issues: [...s.issues, issue] });
        return issue;
      },

      reorder: (orderedIds) =>
        set((s) => {
          const slots = orderedIds.map((id) => s.issues.find((i) => i.id === id)!.rank).sort((a, b) => a - b);
          const rankOf = new Map(orderedIds.map((id, idx) => [id, slots[idx]]));
          return { issues: s.issues.map((i) => (rankOf.has(i.id) ? { ...i, rank: rankOf.get(i.id)! } : i)) };
        }),

      archiveIssue: (id) => get().updateIssue(id, { archived: true, sprintId: undefined }, 'Lưu trữ (xoá khỏi backlog)'),

      splitIssue: (id, titles, toEpic) => {
        const s = get();
        const parent = s.issues.find((i) => i.id === id)!;
        let epicId = parent.epicId;
        if (toEpic) epicId = get().createEpic(parent.title).id;
        titles.forEach((title, idx) =>
          get().createIssue({ title, epicId, goalId: parent.goalId, labelIds: parent.labelIds, rank: parent.rank + idx + 1 }),
        );
        if (toEpic) get().updateIssue(id, { archived: true }, `Chuyển thành epic, tách ${titles.length} story`);
        else get().updateIssue(id, {}, `Tách ${titles.length} story con`);
      },

      createSprint: (patch) => {
        const s = get();
        const n = s.sprints.length + 1;
        const last = [...s.sprints].sort((a, b) => b.endDate.localeCompare(a.endDate))[0];
        const start = new Date(last ? last.endDate : nowIso());
        start.setDate(start.getDate() + 3);
        const end = new Date(start);
        end.setDate(end.getDate() + s.settings.sprintLengthDays - 1);
        const sprint: Sprint = {
          id: uid('s'), name: `FRA Sprint ${n}`, goal: '', startDate: start.toISOString().slice(0, 10),
          endDate: end.toISOString().slice(0, 10), state: 'planned', capacity: {}, scopeChanges: [],
          reviewNotes: '', stakeholderFeedback: '', retro: { well: [], wrong: [], learned: [], improve: [], actions: [] },
          ...patch,
        };
        set({ sprints: [...s.sprints, sprint] });
        return sprint;
      },

      updateSprint: (id, patch) => set((s) => ({ sprints: s.sprints.map((sp) => (sp.id === id ? { ...sp, ...patch } : sp)) })),

      moveToSprint: (issueId, sprintId) => {
        const s = get();
        const issue = s.issues.find((i) => i.id === issueId)!;
        if (issue.sprintId === sprintId) return;
        const changes: Sprint[] = s.sprints.map((sp) => {
          if (sp.state !== 'active') return sp;
          if (sp.id === sprintId) return { ...sp, scopeChanges: [...sp.scopeChanges, { at: nowIso(), issueId, delta: issue.storyPoints ?? 0 }] };
          if (sp.id === issue.sprintId) return { ...sp, scopeChanges: [...sp.scopeChanges, { at: nowIso(), issueId, delta: -(issue.storyPoints ?? 0) }] };
          return sp;
        });
        const target = s.sprints.find((sp) => sp.id === sprintId);
        set({ sprints: changes });
        const patch: Partial<Issue> = { sprintId };
        if (target?.state === 'active' && issue.kind === 'backlog') Object.assign(patch, { kind: 'task', status: 'planned' });
        if (!target && issue.kind === 'task') Object.assign(patch, { kind: 'backlog', status: 'backlog' });
        get().updateIssue(issueId, patch, target ? (patch.kind === 'task' ? `Đẩy sang Bảng (${target.name})` : `Đưa vào ${target.name}`) : 'Đưa về Product Backlog');
      },

      pushToBoard: (issueId) => {
        const active = get().sprints.find((sp) => sp.state === 'active');
        if (active) return get().moveToSprint(issueId, active.id);
        get().updateIssue(issueId, { kind: 'task', status: 'planned' }, 'Đẩy sang Bảng');
      },

      startSprint: (id) => {
        const s = get();
        if (s.sprints.some((sp) => sp.state === 'active')) return;
        set({ sprints: s.sprints.map((sp) => (sp.id === id ? { ...sp, state: 'active', startDate: nowIso().slice(0, 10) } : sp)) });
        s.issues.filter((i) => i.sprintId === id && i.kind === 'backlog').forEach((i) => get().updateIssue(i.id, { kind: 'task', status: 'planned' }, 'Start sprint → đẩy sang Bảng'));
        if (get().selectedIssueId && get().issues.find((i) => i.id === get().selectedIssueId)?.kind === 'task') set({ selectedIssueId: null });
      },

      completeSprint: (id, carry) => {
        const s = get();
        const sprint = s.sprints.find((sp) => sp.id === id)!;
        const items = s.issues.filter((i) => i.sprintId === id && !i.archived);
        const committed = items.reduce((a, i) => a + (i.storyPoints ?? 0), 0);
        const completed = items.filter((i) => i.status === 'done').reduce((a, i) => a + (i.storyPoints ?? 0), 0);
        let next = s.sprints.find((sp) => sp.state === 'planned');
        if (!next && Object.values(carry).includes('next')) next = get().createSprint();
        set((st) => ({
          sprints: st.sprints.map((sp) => (sp.id === id ? { ...sp, state: 'completed', committedPoints: committed, completedPoints: completed } : sp)),
        }));
        for (const [issueId, where] of Object.entries(carry)) {
          get().updateIssue(
            issueId,
            where === 'next' ? { sprintId: next?.id } : { sprintId: undefined, kind: 'backlog', status: 'backlog' },
            where === 'next' ? `Carry-over từ ${sprint.name}` : `Trả về Product Backlog từ ${sprint.name}`,
          );
        }
      },

      createSession: (patch) => {
        const session: GroomingSession = {
          id: uid('g-'), title: 'Grooming session', date: nowIso(), facilitatorId: 'me', attendeeIds: ['me'], goal: '',
          agenda: [], prep: {}, status: 'planned', targetMinutes: 60, perStoryMinutes: 8, log: [], notes: '', ...patch,
        };
        set((s) => ({ sessions: [...s.sessions, session] }));
        return session;
      },
      updateSession: (id, patch) => set((s) => ({ sessions: s.sessions.map((g) => (g.id === id ? { ...g, ...patch } : g)) })),
      logSession: (id, entry) =>
        set((s) => ({ sessions: s.sessions.map((g) => (g.id === id ? { ...g, log: [...g.log, { ...entry, at: nowIso() }] } : g)) })),

      createIdea: (patch) =>
        set((s) => ({
          ideas: [...s.ideas, { id: uid('id'), description: '', source: 'internal', requester: '', requestCount: 1, quote: '', createdAt: nowIso(), gate: {}, status: 'inbox', ...patch }],
        })),
      updateIdea: (id, patch) => set((s) => ({ ideas: s.ideas.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      promoteIdea: (id) => {
        const idea = get().ideas.find((i) => i.id === id)!;
        const issue = get().createIssue({
          title: idea.title, description: idea.description, source: idea.source,
          whyNow: idea.quote ? `${idea.requester}: ${idea.quote}` : idea.requester,
        });
        get().updateIdea(id, { status: 'promoted', promotedIssueId: issue.id });
      },

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      createEpic: (name) => {
        const epic: Epic = { id: uid('e-'), name, color: '#8b5cf6', description: '' };
        set((s) => ({ epics: [...s.epics, epic] }));
        return epic;
      },
      reset: () => set({ ...seed(), selectedIssueId: null }),
    }),
    {
      name: 'crm-backlog-prototype',
      version: 2,
      // v2 tách backlog item / task → dữ liệu cũ không tương thích, nạp lại seed.
      migrate: () => seed(),
      partialize: ({ issues, epics, sprints, sessions, ideas, settings }) => ({ issues, epics, sprints, sessions, ideas, settings }),
    },
  ),
);

/** Map id → issue, tiện cho dependency/readiness. */
export const useIssueMap = () => {
  const issues = useStore((s) => s.issues);
  return new Map(issues.map((i) => [i.id, i]));
};
