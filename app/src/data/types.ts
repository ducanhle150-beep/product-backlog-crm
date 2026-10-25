// Domain model cho prototype Product Backlog (replica "Quản lý công việc" — MIDA Fraud Feature).

export type StatusId = 'backlog' | 'planned' | 'todo' | 'doing' | 'reviewing' | 'retest' | 'done';
/** backlog = item trong Product Backlog (có cấu hình PM); task = đã đẩy sang Bảng để thực thi. */
export type IssueKind = 'backlog' | 'task';
export type IssueType = 'epic' | 'story' | 'task' | 'bug' | 'spike' | 'techdebt' | 'improvement';
export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type BugSeverity = 'critical' | 'important' | 'minor';
export type TShirt = 'S' | 'M' | 'L' | 'XL';
export type Source = 'paying' | 'trial' | 'lead' | 'internal' | 'investor' | 'support';

export interface Member {
  id: string;
  name: string; // "SAE.H - Huân NV"
  initial: string;
  color: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface StrategicGoal {
  id: string;
  name: string;
  color: string;
}

export interface Epic {
  id: string;
  name: string;
  color: string;
  goalId?: string;
  description: string;
}

export interface Competitor {
  id: string;
  name: string;
  type: 'direct' | 'indirect';
}

export interface ChecklistItem {
  id: string;
  text: string;
}

export interface UserStory {
  asA: string;
  iWant: string;
  soThat: string;
}

export interface AcceptanceCriterion {
  id: string;
  text: string;
  done: boolean;
}

export interface EstimateVote {
  memberId: string;
  points: number;
  reason: string;
}

export interface ActivityEntry {
  at: string; // ISO
  text: string;
}

/** Inputs đã chấm theo từng method — key là methodId, value là object input của method đó. */
export type ScoreMap = Record<string, Record<string, unknown>>;

export interface Issue {
  id: string;
  key: string; // FRAUD_F-24
  num: number;
  kind: IssueKind;
  title: string;
  type: IssueType;
  status: StatusId;
  priority: Priority;
  labelIds: string[];
  epicId?: string;
  goalId?: string;
  reporterId?: string;
  assigneeId?: string;
  dueDate?: string; // yyyy-MM-dd
  createdAt: string;
  updatedAt: string;
  doneAt?: string;
  rank: number; // nhỏ = ưu tiên cao
  sprintId?: string;
  storyPoints?: number;
  tshirt?: TShirt;
  userStory?: UserStory;
  description: string;
  acceptanceCriteria: AcceptanceCriterion[];
  dor: Record<string, boolean>; // ChecklistItem.id -> checked
  dod: Record<string, boolean>;
  invest: Record<string, boolean>; // I N V E S T
  blockedBy: string[]; // issue ids
  bugSeverity?: BugSeverity;
  source?: Source;
  whyNow: string;
  successMetric: string;
  scores: ScoreMap;
  scoreReasoning: string;
  votes: EstimateVote[];
  lastGroomedAt?: string;
  archived?: boolean;
  activity: ActivityEntry[];
}

export interface RetroBoard {
  well: string[];
  wrong: string[];
  learned: string[];
  improve: string[];
  actions: { id: string; text: string; done: boolean }[];
}

export interface Sprint {
  id: string;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  state: 'planned' | 'active' | 'completed';
  capacity: Record<string, number>; // memberId -> points
  /** Snapshot lịch sử cho sprint đã xong (issue cũ không có trong dataset). */
  committedPoints?: number;
  completedPoints?: number;
  scopeChanges: { at: string; issueId: string; delta: number }[];
  reviewNotes: string;
  stakeholderFeedback: string;
  retro: RetroBoard;
}

export interface GroomingLogEntry {
  at: string;
  issueId?: string;
  action: 'added' | 'removed' | 'split' | 'estimated' | 'reprioritized' | 'ready' | 'rewritten' | 'note';
  detail: string;
}

export interface GroomingSession {
  id: string;
  title: string;
  date: string; // ISO datetime
  facilitatorId: string;
  attendeeIds: string[];
  goal: string;
  agenda: string[]; // issue ids
  prep: Record<string, boolean>;
  status: 'planned' | 'running' | 'done';
  targetMinutes: number;
  perStoryMinutes: number;
  log: GroomingLogEntry[];
  notes: string;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  source: Source;
  requester: string;
  requestCount: number;
  quote: string;
  createdAt: string;
  gate: Record<string, boolean>;
  status: 'inbox' | 'parking' | 'promoted' | 'rejected';
  promotedIssueId?: string;
}

export interface Settings {
  vision: string;
  visionImpact: string;
  goals: StrategicGoal[];
  dorItems: ChecklistItem[];
  dodItems: ChecklistItem[];
  activeMethod: string;
  competitors: Competitor[];
  cafWeights: { direct: number; indirect: number };
  adoptionScores: { no: number; basic: number; good: number; advanced: number };
  phaseThresholds: { p1: number; p2: number; p3: number }; // >p1, p2..p1, p3..p2, <p3
  moscowPoints: { M: number; S: number; C: number; W: number };
  stakeholders: { id: string; name: string }[];
  staleMonths: number;
  sprintLengthDays: number;
  lastBacklogReviewAt?: string;
  reviewChecklist: Record<string, boolean>;
}
