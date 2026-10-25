// Seed: 44 issue thật của MIDA Fraud Feature (title/status/label/type/due lấy từ snapshot CRM 2026-10-24)
// + DỮ LIỆU DEMO (điểm, story point, sprint, user story, grooming, ideas) để prototype có nội dung.
import type {
  Epic, GroomingSession, Idea, Issue, IssueType, Label, Member, Settings, Sprint, StatusId,
} from './types';
import type { Adoption } from '../lib/prioritization/saeIceCaf';

export const TODAY = '2026-10-24';
export const ME = 'me';

export const MEMBERS: Member[] = [
  { id: 'huan', name: 'SAE.H - Huân NV', initial: 'S', color: '#b5a72c' },
  { id: 'hai', name: 'SAE.H - Hải NT', initial: 'S', color: '#30a46c' },
  { id: 'thong', name: 'SAE.H - Thông BT', initial: 'S', color: '#12a594' },
  { id: 'erik', name: 'SAE.P - Erik', initial: 'S', color: '#a18072' },
  { id: 'anhv', name: 'SAE.P - Anh VSNL', initial: 'S', color: '#8e7d75' },
  { id: 'huyen', name: 'SAE.P - Huyền NN', initial: 'S', color: '#e5484d' },
  { id: 'xuan', name: 'SAE.P - Xuân PNT', initial: 'S', color: '#4cc38a' },
  { id: 'huong', name: 'SAE.P - Hương ND', initial: 'S', color: '#05a2c2' },
  { id: 'jacob', name: 'SBC - Jacob', initial: 'S', color: '#0d9b8a' },
  { id: 'vyvtk', name: 'SAE.P - Vy VTK', initial: 'S', color: '#8e4ec6' },
  { id: 'judith', name: 'SAE.P Judith', initial: 'S', color: '#f76b15' },
  { id: 'linh', name: 'SAE.P - Linh LT1', initial: 'S', color: '#3e63dd' },
  { id: 'vynmk', name: 'SAE.P - Vy NMK', initial: 'S', color: '#299764' },
  { id: 'cuong', name: 'SAE.C - Cường CX', initial: 'S', color: '#d6409f' },
  { id: 'jenny', name: 'SAE.P - Jenny', initial: 'S', color: '#0090ff' },
  { id: 'eloise', name: 'SAE.P - Eloise', initial: 'S', color: '#978365' },
  { id: ME, name: 'Bạn (PM)', initial: 'B', color: '#3b6ef5' },
];

export const LABELS: Label[] = [
  { id: 'pricing', name: 'Pricing plan', color: '#a3e635' },
  { id: 'ideas', name: 'Fraud Ideas', color: '#22c55e' },
  { id: 'enh', name: 'Enhancement', color: '#3b82f6' },
  { id: 'docs', name: 'Documentation', color: '#f59e0b' },
];

export const EPICS: Epic[] = [
  { id: 'e-pricing', name: 'Pricing & Plan', color: '#a3e635', goalId: 'g1', description: 'Gói trả phí, quota, annual plan, UI sau pricing.' },
  { id: 'e-rules', name: 'Rule engine & Blocking', color: '#ef4444', goalId: 'g3', description: 'Blocking rule, redirect, whitelist, checkout rule, fake order.' },
  { id: 'e-ai', name: 'MCP & AI', color: '#8b5cf6', goalId: 'g3', description: 'MCP server, skill, tự động hoá bằng AI.' },
  { id: 'e-onboarding', name: 'Onboarding & Docs', color: '#f59e0b', goalId: 'g2', description: 'Onboarding, FAQ in-app, docs, help center.' },
  { id: 'e-notify', name: 'Integrations & Notifications', color: '#05a2c2', goalId: 'g2', description: 'Email report, notification, Shopify Flow, tích hợp.' },
];

export const SPRINT_IDS = { s1: 's1', s2: 's2', s3: 's3', s4: 's4' };

type Row = [
  num: number, title: string, type: IssueType, status: StatusId, labels: string[],
  reporter: string | null, assignee: string | null, due: string | null, points: number | null,
  epic: string | null, sprint: string | null,
];

// Thứ tự mảng = rank (khớp thứ tự tab Backlog + Kanban của CRM gốc).
const ROWS: Row[] = [
  [47, 'Refactor lại code Pricing', 'task', 'todo', [], 'erik', 'judith', null, 3, 'e-pricing', 's4'],
  [30, 'Bổ sung Email report', 'task', 'reviewing', [], 'anhv', 'judith', null, 3, 'e-notify', 's4'],
  [29, 'Bug: Production after feature/ Tích hợp Mida-Fraud', 'bug', 'doing', [], null, 'huong', null, 3, null, 's4'],
  [28, 'Convert review từ khách cũ ( 4/4 )', 'task', 'doing', ['pricing'], 'anhv', 'hai', '2026-10-06', 2, 'e-pricing', 's4'],
  [27, 'Email thông báo khi reach 70% và 100% visitor analytic quota', 'task', 'reviewing', ['pricing'], 'anhv', 'erik', null, 2, 'e-pricing', 's4'],
  [24, 'Bổ sung MCP cho Fraud', 'bug', 'backlog', [], 'huan', 'hai', null, 8, 'e-ai', null],
  [43, 'Bổ sung Block fake order vào trang docs', 'task', 'backlog', [], 'anhv', 'erik', null, 2, 'e-rules', 's5'],
  [42, 'Research: Nghiên cứu Cloudflare Radar', 'bug', 'doing', [], 'hai', 'cuong', '2026-09-18', 2, null, 's4'],
  [41, 'Update: Migrate offline token', 'bug', 'reviewing', [], 'hai', 'judith', '2026-09-17', 2, null, 's4'],
  [40, 'Analytic', 'bug', 'backlog', [], 'huan', null, null, 5, null, null],
  [39, 'Update listing', 'bug', 'backlog', [], 'huan', 'erik', null, 2, null, null],
  [25, 'Build MCP', 'bug', 'reviewing', [], 'huan', 'judith', null, 5, 'e-ai', 's4'],
  [26, 'Feautre', 'bug', 'backlog', [], 'huan', 'erik', null, null, null, null],
  [38, 'Update: Notification Bell', 'task', 'reviewing', [], 'anhv', 'judith', null, 3, 'e-notify', 's4'],
  [23, 'Update: Banner suggest good bot', 'story', 'backlog', [], null, null, null, null, 'e-rules', null],
  [36, 'Update : Add thêm whitelist ,redirect vào Rule Execution Order', 'story', 'backlog', ['ideas'], 'huan', null, null, 5, 'e-rules', 's5'],
  [35, 'Update : Chuyển Auto tag thành Visitor Tag', 'story', 'backlog', ['ideas'], 'huan', null, null, 3, 'e-rules', null],
  [34, 'Update : Fix lại Admin Access URL', 'improvement', 'backlog', ['ideas'], 'huan', null, null, 1, null, null],
  [33, 'Update : Nâng cao disable dev tool', 'story', 'backlog', ['ideas'], 'huan', null, null, 5, null, null],
  [21, 'Update: Nhập tuổi trước khi vào store', 'story', 'backlog', ['ideas'], null, null, null, 3, null, null],
  [22, 'Update : Khoá chức năng bật/tắt Record Order', 'improvement', 'backlog', [], 'anhv', 'erik', null, 2, 'e-rules', null],
  [32, 'Update : Update lại onboarding của app.', 'story', 'backlog', ['ideas'], 'anhv', 'erik', null, 8, 'e-onboarding', null],
  [31, 'Update: Tự động hủy đơn hàng rủi ro cao (chỉ dành cho Plus)', 'story', 'backlog', [], null, 'erik', null, 13, 'e-rules', null],
  [20, 'Update: Tạo block rule đơn giản', 'story', 'backlog', ['ideas'], null, 'erik', null, 5, 'e-rules', 's5'],
  [18, 'Update block fake order', 'story', 'backlog', [], 'huan', null, null, 5, 'e-rules', null],
  [17, 'Bổ sung Integrations Page & Shopify Flow Integration', 'story', 'reviewing', [], 'huan', 'hai', null, 5, 'e-notify', 's4'],
  [16, 'Update skill cho fraud', 'task', 'backlog', [], 'huan', null, null, 3, 'e-ai', null],
  [15, 'Update logic checkout rule', 'task', 'backlog', [], 'huan', null, null, 5, 'e-rules', null],
  [14, 'Quota card visitor logs trên Dashboard', 'task', 'todo', [], 'anhv', 'hai', '2026-10-26', 2, 'e-pricing', 's4'],
  [13, 'Migrate sang web component', 'techdebt', 'doing', [], 'huan', 'hai', null, 5, null, 's4'],
  [11, 'Refined lại backlog của Product', 'task', 'backlog', ['docs', 'enh'], 'huan', null, null, 2, null, null],
  [10, 'Nghiên cứu onboarding riêng cho khách Plus', 'spike', 'backlog', [], 'huan', null, null, 3, 'e-onboarding', null],
  [9, 'Tổng hợp lại trigger hiện có và setup lại trigger cho khách', 'task', 'backlog', [], null, null, null, null, 'e-notify', null],
  [8, 'Bổ sung Annual Plan', 'story', 'backlog', ['pricing'], null, null, null, 5, 'e-pricing', 's5'],
  [7, 'Bổ sung FAQ + Pricing vào docs', 'task', 'backlog', ['pricing'], null, null, null, 2, 'e-onboarding', null],
  [6, 'Bổ sung lại Redirect', 'story', 'backlog', [], null, null, null, 3, 'e-rules', 's5'],
  [5, 'Bổ sung condition Product', 'story', 'backlog', [], null, null, null, 5, 'e-rules', null],
  [4, 'Rà soát/update lại UI sau pricing của Fraud', 'task', 'todo', [], 'anhv', 'hai', null, 2, 'e-pricing', 's4'],
  [3, 'Mail gửi khách cũ chưa claim free forever', 'task', 'backlog', [], null, null, null, null, 'e-notify', null],
  [2, 'Update : Bổ sung FAQ in-app ( Fraud )', 'story', 'todo', ['enh'], 'anhv', 'hai', null, 2, 'e-onboarding', 's4'],
  // Task DEMO (không có trong CRM) — cột PLANNED
  [48, '[Demo] Viết test cho email quota 70% / 100%', 'task', 'planned', [], 'anhv', 'erik', null, 1, 'e-pricing', 's4'],
  [49, '[Demo] Cập nhật help docs cho Notification Bell', 'task', 'planned', ['docs'], 'anhv', 'huong', '2026-10-29', 1, 'e-onboarding', 's4'],
  [50, '[Demo] Chuẩn bị release note Sprint 4', 'task', 'planned', [], 'huan', null, '2026-10-30', 1, null, 's4'],
  [44, 'Nghiên cứu pricing plan', 'task', 'done', ['pricing'], 'huan', null, '2026-09-10', 3, 'e-pricing', 's1'],
  [37, '(Bug production) F5 tại trang Edit Block Page thì bị back về page Blocking Rules', 'bug', 'done', [], null, 'hai', null, 2, null, 's3'],
  [19, 'Bug: Có tính value của Blocking Rules', 'bug', 'done', [], 'hai', 'judith', null, 1, null, 's4'],
  [12, 'Update thêm thông tin merchant về ngày bắt đầu plan và ngày cài app sang CRM', 'task', 'done', [], 'judith', null, null, 2, null, 's4'],
];

const DONE_AT: Record<number, string> = { 44: '2026-09-10', 37: '2026-10-15', 19: '2026-10-21', 12: '2026-10-22' };

type Sae = [i: number, c: number, e: number, a: Adoption, b: Adoption, cc: Adoption];
const SAE: Record<number, Sae> = {
  24: [7, 5, 4, 'advanced', 'no', 'good'], 43: [4, 8, 9, 'good', 'good', 'no'], 40: [6, 5, 4, 'good', 'basic', 'good'],
  39: [6, 6, 8, 'no', 'no', 'no'], 23: [5, 6, 8, 'basic', 'no', 'no'], 36: [7, 7, 6, 'good', 'good', 'basic'],
  35: [5, 6, 7, 'no', 'basic', 'no'], 34: [4, 8, 9, 'no', 'no', 'no'], 33: [6, 6, 5, 'advanced', 'good', 'good'],
  21: [4, 5, 7, 'basic', 'no', 'good'], 22: [5, 7, 8, 'no', 'no', 'no'], 32: [8, 6, 5, 'good', 'good', 'good'],
  31: [8, 5, 3, 'advanced', 'good', 'no'], 20: [7, 7, 6, 'good', 'advanced', 'good'], 18: [7, 6, 5, 'good', 'good', 'no'],
  16: [5, 5, 6, 'no', 'no', 'no'], 15: [6, 6, 4, 'good', 'basic', 'no'], 11: [3, 8, 8, 'no', 'no', 'no'],
  10: [6, 4, 5, 'basic', 'no', 'no'], 8: [7, 7, 8, 'good', 'good', 'good'], 7: [4, 8, 9, 'good', 'basic', 'good'],
  6: [6, 7, 6, 'good', 'good', 'good'], 5: [6, 6, 5, 'good', 'basic', 'no'], 3: [5, 6, 9, 'no', 'no', 'no'],
  47: [5, 7, 4, 'no', 'no', 'no'], 14: [6, 7, 7, 'good', 'no', 'no'], 4: [6, 7, 7, 'no', 'no', 'no'],
  2: [5, 8, 8, 'good', 'good', 'basic'], 28: [6, 6, 8, 'no', 'no', 'no'], 27: [6, 8, 7, 'good', 'basic', 'no'],
  30: [6, 7, 6, 'good', 'good', 'good'], 38: [5, 7, 7, 'basic', 'good', 'no'], 17: [8, 6, 4, 'advanced', 'good', 'good'],
  13: [6, 6, 4, 'no', 'no', 'no'], 25: [7, 5, 4, 'advanced', 'no', 'good'],
};

const WSJF: Record<number, [bv: number, tc: number, rroe: number, js: number, risk: number]> = {
  20: [8, 5, 5, 5, 0], 36: [5, 3, 5, 5, 0], 8: [13, 8, 3, 5, 0], 43: [3, 3, 2, 2, 0], 6: [5, 3, 3, 3, 0],
  33: [3, 2, 5, 5, 2], 32: [8, 3, 5, 8, 0], 18: [5, 5, 3, 5, 0], 24: [5, 2, 8, 8, 2], 31: [8, 2, 3, 13, 3],
};

const MOSCOW_LABEL: Record<number, 'M' | 'S' | 'C' | 'W'> = {
  20: 'M', 8: 'M', 36: 'M', 6: 'M', 43: 'S', 18: 'S', 32: 'S', 33: 'S', 7: 'S', 24: 'C', 31: 'C', 21: 'C', 16: 'C', 26: 'W', 11: 'W',
};

const RISK_VALUE: Record<number, [value: number, risk: number, type: string]> = {
  20: [8, 4, 'technical'], 36: [7, 6, 'technical'], 8: [9, 3, 'business'], 31: [8, 8, 'business'], 24: [6, 8, 'technical'],
  33: [6, 7, 'technical'], 43: [4, 2, 'schedule'], 21: [3, 6, 'business'], 6: [6, 3, 'technical'], 32: [8, 5, 'schedule'],
};

const STORIES: Record<number, { asA: string; iWant: string; soThat: string; ac: string[]; why: string; metric: string }> = {
  20: {
    asA: 'merchant mới cài app', iWant: 'tạo block rule theo quốc gia/IP chỉ với 1 form đơn giản', soThat: 'chặn traffic xấu ngay mà không cần hiểu rule engine',
    ac: ['Form có 3 bước: chọn điều kiện → giá trị → hành động (Block/Redirect)', 'Rule tạo xong đồng bộ sang tracker trong < 5s', 'Có preview số visitor bị ảnh hưởng 7 ngày qua'],
    why: 'Ticket support cho thấy merchant mới bỏ cuộc ở màn hình tạo rule.', metric: '% merchant tạo rule đầu tiên trong 24h sau cài tăng từ 35% → 55%',
  },
  36: {
    asA: 'merchant dùng nhiều loại rule', iWant: 'sắp xếp thứ tự whitelist/redirect cùng blacklist trong Rule Execution Order', soThat: 'kiểm soát rule nào chạy trước',
    ac: ['Rule Execution Order hiển thị cả Whitelist, Blacklist, Redirect', 'Kéo thả để đổi thứ tự, lưu và sync sang tracker', 'Shop có legacy rule hiện cảnh báo short-circuit'],
    why: 'Đối thủ đã có; merchant Plus yêu cầu nhiều lần.', metric: 'Giảm 30% ticket "rule không chạy đúng"',
  },
  8: {
    asA: 'merchant đang dùng gói tháng', iWant: 'chuyển sang gói năm có giảm giá', soThat: 'tiết kiệm chi phí',
    ac: ['Trang Pricing có toggle Monthly/Annual', 'Annual giảm 20% so với tháng', 'Billing Shopify tạo đúng recurring annual charge'],
    why: 'Annual plan tăng LTV và giảm churn — mục tiêu quý.', metric: '15% merchant mới chọn Annual trong 30 ngày',
  },
  43: {
    asA: 'merchant', iWant: 'đọc hướng dẫn Block fake order trên trang docs', soThat: 'tự cấu hình được không cần hỏi support',
    ac: ['Bài docs có ảnh từng bước', 'Link từ màn hình Block fake order trong app'],
    why: 'Feature đã ship nhưng chưa có docs.', metric: 'Ticket về fake order giảm 20%',
  },
  6: {
    asA: 'merchant', iWant: 'redirect visitor bị chặn sang URL tuỳ chọn', soThat: 'không mất khách thật bị chặn nhầm',
    ac: ['Chọn Redirect làm action cho rule', 'Validate URL hợp lệ', 'Tracker trả REDIRECT với target đúng'],
    why: 'Tính năng cũ bị gỡ khi refactor, khách cũ phàn nàn.', metric: '0 ticket "mất redirect" sau release',
  },
};

const isoDay = (d: string, hh = '09:00') => `${d}T${hh}:00.000Z`;
function createdFor(num: number): string {
  // F-2 → 2026-09-01 … F-47 → 2026-10-22
  const start = Date.UTC(2026, 8, 1);
  const day = Math.round(((num - 2) / 45) * 51);
  return new Date(start + day * 86400000).toISOString();
}

export function buildIssues(settings: Settings): Issue[] {
  const comps = settings.competitors;
  return ROWS.map((r, idx): Issue => {
    const [num, title, type, status, labels, reporter, assignee, due, points, epic, sprint] = r;
    const created = createdFor(num);
    const scores: Issue['scores'] = {};
    const sae = SAE[num];
    if (sae) {
      scores['sae-ice-caf'] = {
        impact: sae[0], confidence: sae[1], ease: sae[2],
        adoption: { [comps[0].id]: sae[3], [comps[1].id]: sae[4], [comps[2].id]: sae[5] },
      };
      scores['ice'] = { impact: sae[0], confidence: sae[1], ease: sae[2] };
    }
    const w = WSJF[num];
    if (w) scores['wsjf'] = { bv: w[0], tc: w[1], rroe: w[2], jobSize: w[3], risk: w[4] };
    if (MOSCOW_LABEL[num]) scores['moscow'] = { label: MOSCOW_LABEL[num] };
    const rv = RISK_VALUE[num];
    if (rv) scores['risk-value'] = { value: rv[0], risk: rv[1], riskType: rv[2] };

    const st = STORIES[num];
    const groomed = !!st || (sprint !== null && status !== 'done');
    return {
      id: `i${num}`,
      key: `FRAUD_F-${num}`,
      num,
      kind: status === 'backlog' ? 'backlog' : 'task',
      title,
      type,
      status,
      priority: num === 12 ? 'high' : 'medium',
      labelIds: labels,
      epicId: epic ?? undefined,
      goalId: EPICS.find((e) => e.id === epic)?.goalId,
      reporterId: reporter ?? undefined,
      assigneeId: assignee ?? undefined,
      dueDate: due ?? undefined,
      createdAt: created,
      updatedAt: created,
      doneAt: DONE_AT[num] ? isoDay(DONE_AT[num], '16:00') : undefined,
      rank: (idx + 1) * 1000,
      sprintId: sprint ?? undefined,
      storyPoints: points ?? undefined,
      tshirt: points === null ? undefined : points <= 2 ? 'S' : points <= 5 ? 'M' : points <= 8 ? 'L' : 'XL',
      userStory: st ? { asA: st.asA, iWant: st.iWant, soThat: st.soThat } : undefined,
      description: '',
      acceptanceCriteria: (st?.ac ?? []).map((text, i) => ({ id: `ac${num}-${i}`, text, done: status === 'done' })),
      dor: (groomed ? { dor6: true, dor7: true } : {}) as Record<string, boolean>,
      dod: status === 'done' ? Object.fromEntries(settings.dodItems.map((d) => [d.id, true])) : {},
      invest: st ? { I: true, N: true, V: true, E: true, S: (points ?? 99) <= 8, T: true } : {},
      blockedBy: num === 31 ? ['i20'] : num === 5 ? ['i15'] : num === 18 ? ['i43'] : num === 8 ? ['i47'] : [],
      bugSeverity: type === 'bug' ? (status === 'done' || num === 29 ? 'critical' : 'important') : undefined,
      source: labels.includes('ideas') ? 'internal' : num === 36 || num === 31 ? 'paying' : undefined,
      whyNow: st?.why ?? '',
      successMetric: st?.metric ?? '',
      scores,
      scoreReasoning: '',
      votes: [],
      lastGroomedAt: groomed ? isoDay('2026-10-15', '10:00') : undefined,
      activity: [{ at: created, text: 'Tạo issue' }],
    };
  });
}

const emptyRetro = () => ({ well: [], wrong: [], learned: [], improve: [], actions: [] });

export const SPRINTS: Sprint[] = [
  {
    id: 's1', name: 'FRA Sprint 1', goal: 'Chốt hướng pricing plan và sửa bug blocking quan trọng.',
    startDate: '2026-09-07', endDate: '2026-09-18', state: 'completed', capacity: {},
    committedPoints: 32, completedPoints: 28, scopeChanges: [], reviewNotes: '', stakeholderFeedback: '', retro: emptyRetro(),
  },
  {
    id: 's2', name: 'FRA Sprint 2', goal: 'Hoàn thiện tích hợp Mida-Fraud giai đoạn 1.',
    startDate: '2026-09-21', endDate: '2026-10-02', state: 'completed', capacity: {},
    committedPoints: 36, completedPoints: 33, scopeChanges: [], reviewNotes: '', stakeholderFeedback: '', retro: emptyRetro(),
  },
  {
    id: 's3', name: 'FRA Sprint 3', goal: 'Ổn định production sau release pricing mới.',
    startDate: '2026-10-05', endDate: '2026-10-16', state: 'completed', capacity: {},
    committedPoints: 40, completedPoints: 36, scopeChanges: [],
    reviewNotes: 'Demo pricing mới cho CS; fix F5 Edit Block Page.', stakeholderFeedback: 'CS muốn có email cảnh báo quota.',
    retro: {
      well: ['Release pricing đúng hạn', 'Pair debugging bug production nhanh'],
      wrong: ['Nhiều item kẹt ở REVIEWING', 'Item vào sprint khi chưa có AC'],
      learned: ['Cần grooming trước planning ít nhất 2 ngày'],
      improve: ['Áp dụng Definition of Ready trước khi kéo vào sprint'],
      actions: [{ id: 'a1', text: 'Thêm checklist DoR vào backlog tool', done: true }, { id: 'a2', text: 'Giới hạn WIP REVIEWING ≤ 4', done: false }],
    },
  },
  {
    id: 's4', name: 'FRA Sprint 4', goal: 'Đưa email quota + notification + integrations lên production.',
    startDate: '2026-10-19', endDate: '2026-10-30', state: 'active',
    capacity: { hai: 10, judith: 10, erik: 6, huong: 4, cuong: 3 },
    scopeChanges: [{ at: isoDay('2026-10-21'), issueId: 'i14', delta: 2 }],
    reviewNotes: '', stakeholderFeedback: '', retro: emptyRetro(),
  },
  {
    id: 's5', name: 'FRA Sprint 5', goal: 'Giúp merchant mới tạo rule chặn đầu tiên trong 5 phút và mở bán gói Annual.',
    startDate: '2026-11-02', endDate: '2026-11-13', state: 'planned',
    capacity: { erik: 8, hai: 8, judith: 6 },
    scopeChanges: [], reviewNotes: '', stakeholderFeedback: '', retro: emptyRetro(),
  },
];

export const DEFAULT_SETTINGS: Settings = {
  vision: 'BSS Fraud Blocker giúp merchant Shopify chặn bot, IP/VPN xấu và đơn hàng gian lận trước khi gây thiệt hại.',
  visionImpact: 'giúp merchant tự bảo vệ store trong 5 phút đầu sau khi cài và nâng cấp lên gói trả phí',
  goals: [
    { id: 'g1', name: 'Tăng chuyển đổi Free → Paid', color: '#22c55e' },
    { id: 'g2', name: 'Giảm churn merchant', color: '#f97316' },
    { id: 'g3', name: 'Competitive parity', color: '#3b82f6' },
    { id: 'g4', name: 'Nền tảng kỹ thuật', color: '#a855f7' },
  ],
  dorItems: [
    { id: 'dor1', text: 'User story rõ ràng (As a / I want / So that)' },
    { id: 'dor2', text: 'Acceptance criteria đã viết, team hiểu' },
    { id: 'dor3', text: 'Đã estimate story point' },
    { id: 'dor4', text: 'Đủ nhỏ để xong trong 1 sprint (≤ 8 pt)' },
    { id: 'dor5', text: 'Dependency đã xác định, không bị block' },
    { id: 'dor6', text: 'Có design/UX hoặc không cần' },
    { id: 'dor7', text: 'PO đã ưu tiên và giải thích "why"' },
  ],
  dodItems: [
    { id: 'dod1', text: 'Code review đã approve' },
    { id: 'dod2', text: 'Unit/automated test pass' },
    { id: 'dod3', text: 'QA test + RETEST pass' },
    { id: 'dod4', text: 'Đạt toàn bộ acceptance criteria' },
    { id: 'dod5', text: 'Docs / help center đã cập nhật' },
    { id: 'dod6', text: 'Deploy production, monitor ổn định' },
    { id: 'dod7', text: 'PO accept tại sprint review' },
  ],
  activeMethod: 'sae-ice-caf',
  competitors: [
    { id: 'c1', name: 'Đối thủ A', type: 'direct' },
    { id: 'c2', name: 'Đối thủ B', type: 'direct' },
    { id: 'c3', name: 'Đối thủ C', type: 'indirect' },
  ],
  cafWeights: { direct: 1.5, indirect: 1.0 },
  adoptionScores: { no: 0, basic: 0.7, good: 1.0, advanced: 1.3 },
  phaseThresholds: { p1: 300, p2: 200, p3: 100 },
  moscowPoints: { M: 10, S: 7, C: 3, W: 0 },
  stakeholders: [
    { id: 'sh1', name: 'PM' }, { id: 'sh2', name: 'Tech Lead' }, { id: 'sh3', name: 'CS Lead' },
    { id: 'sh4', name: 'Marketing' }, { id: 'sh5', name: 'Sales/BD' },
  ],
  staleMonths: 6,
  sprintLengthDays: 12,
  lastBacklogReviewAt: isoDay('2026-10-15', '10:00'),
  reviewChecklist: {},
};

export const GROOMING: GroomingSession[] = [
  {
    id: 'g-1', title: 'Grooming trước FRA Sprint 4', date: isoDay('2026-10-15', '03:00'), facilitatorId: ME,
    attendeeIds: [ME, 'huan', 'hai', 'judith', 'erik', 'huong'], goal: 'Ready các item email quota, notification, integrations cho Sprint 4.',
    agenda: ['i27', 'i30', 'i38', 'i17', 'i14'], prep: { p1: true, p2: true, p3: true, p4: true }, status: 'done',
    targetMinutes: 60, perStoryMinutes: 8,
    log: [
      { at: isoDay('2026-10-15', '03:10'), issueId: 'i27', action: 'estimated', detail: 'Estimate 2 pt (votes 2,2,3,2)' },
      { at: isoDay('2026-10-15', '03:20'), issueId: 'i17', action: 'split', detail: 'Tách Shopify Flow trigger sang item sau' },
      { at: isoDay('2026-10-15', '03:35'), issueId: 'i38', action: 'ready', detail: 'Đạt DoR' },
      { at: isoDay('2026-10-15', '03:50'), issueId: 'i14', action: 'reprioritized', detail: 'Đưa lên top theo yêu cầu CS' },
    ],
    notes: 'Kết luận: Sprint 4 tập trung notification. Shopify Flow để sprint sau.',
  },
  {
    id: 'g-2', title: 'Grooming trước FRA Sprint 6', date: isoDay('2026-10-28', '03:00'), facilitatorId: ME,
    attendeeIds: [ME, 'huan', 'hai', 'judith', 'erik'], goal: 'Ready nhóm item cho Sprint 6: dev tool, onboarding, fake order, MCP, auto-cancel Plus.',
    agenda: ['i33', 'i32', 'i18', 'i24', 'i31', 'i5'], prep: {}, status: 'planned', targetMinutes: 60, perStoryMinutes: 8, log: [], notes: '',
  },
];

export const IDEAS: Idea[] = [
  {
    id: 'id1', title: 'Chặn đơn theo device fingerprint', description: 'Dùng fingerprint từ storefront script để chặn thiết bị đặt nhiều đơn giả.',
    source: 'paying', requester: 'Merchant Plus (fashion)', requestCount: 4, quote: '"Cùng 1 máy đổi IP liên tục đặt COD, chúng tôi mất tiền ship."',
    createdAt: isoDay('2026-10-10'), gate: {}, status: 'inbox',
  },
  {
    id: 'id2', title: 'Báo cáo fraud hàng tuần qua Slack', description: 'Gửi tóm tắt visitor/đơn bị chặn vào Slack channel của merchant.',
    source: 'support', requester: 'CS team', requestCount: 2, quote: '', createdAt: isoDay('2026-10-12'), gate: {}, status: 'inbox',
  },
  {
    id: 'id3', title: 'AI gợi ý rule tự động từ traffic', description: 'Phân tích traffic 7 ngày, đề xuất rule chặn quốc gia/ISP bất thường.',
    source: 'internal', requester: 'Tech Lead', requestCount: 1, quote: '', createdAt: isoDay('2026-10-18'), gate: {}, status: 'inbox',
  },
  {
    id: 'id4', title: 'Dark mode cho Block page', description: 'Template block page tối màu.', source: 'trial', requester: 'Trial user',
    requestCount: 1, quote: '', createdAt: isoDay('2026-04-02'), gate: {}, status: 'parking',
  },
  {
    id: 'id5', title: 'Chặn VPN theo từng quốc gia', description: 'Chỉ chặn VPN khi visitor đến từ danh sách quốc gia.', source: 'paying',
    requester: '3 merchant EU', requestCount: 3, quote: '"VPN ở EU là bình thường, ở nước khác thì nghi ngờ."', createdAt: isoDay('2026-09-28'),
    gate: { g1: true, g2: true }, status: 'inbox',
  },
];
