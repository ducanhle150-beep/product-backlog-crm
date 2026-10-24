# Plan: Product Backlog prototype — replica CRM "Quản lý công việc"

## Tiến độ (cập nhật 2026-10-24)
- [x] Bước 1 — Scaffold, tokens, shell, tab Bảng (Kanban), tab Danh sách (List / Buckets / Story map)
- [x] Bước 2 — Store + seed + IssueDrawer + kéo thả rank / sprint
- [x] Bước 3 — Ưu tiên: 9 method + 15 vitest (CAF 0.6375 từ xlsx, MoSCoW 43 từ PDF, WSJF…)
- [x] Bước 4 — Grooming: session, prep checklist, timer, planning poker, DoR/INVEST, tách story/epic
- [x] Bước 5 — Sprint Planning (goal template, capacity, velocity, DoR/dependency warning, start/complete + carry-over) + Insights (velocity, burndown, DEEP, health signals)
- [x] Bước 6 — Review (backlog review, sprint review, retro), Ideas (COPE + intake gate), Thiết lập (vision, goals, DoR/DoD, CAF, reset)
- [ ] Chờ user: tên đối thủ Fraud thật, DoR/DoD của team, độ dài sprint, màu label Documentation

Chạy: `cd /Users/bssgroup/crm-backlog/app && npm run dev` → http://localhost:5173 · Test: `npm test`

## Context
User (PM) muốn một prototype dựng lại phần "Quản lý công việc" của CRM nội bộ (Twenty CRM, workspace.mida-app.io — đã chụp read-only vào `/Users/bssgroup/crm-backlog/quan-ly-cong-viec/`), trong đó tab **Backlog** (cạnh tab **Bảng**/Kanban) được nâng cấp thành một khu **Product Backlog đầy đủ** cho PM: xây backlog, ưu tiên (chọn method), grooming, sprint planning, review, metrics. Nội dung nghiệp vụ lấy từ 5 PDF trong `crm-backlog/backlog-docs/` + các bổ sung user yêu cầu (DEEP, INVEST, DoR/DoD, dependencies, velocity/burndown, framework có tên).

## Quyết định đã chốt
- Vite + React 18 + TypeScript tại `/Users/bssgroup/crm-backlog/app/`; chạy localhost; mở từng file trong VSCode (`code -r <file>`) khi tạo/sửa.
- Data: seed 44 issue thật FRAUD_F (title/status/label/due/type/assignee thật) + **điểm demo hợp lý** (ICE/CAF, story point, vài user story/AC, epic, 1 sprint đã xong + 1 sprint đang chạy). Lưu localStorage, nút "Reset dữ liệu demo". Banner nhỏ "Dữ liệu demo".
- Chỉ project MIDA Fraud Feature; danh sách đối thủ là placeholder sửa được trong Thiết lập.
- UI tiếng Việt, thuật ngữ chuyên môn giữ tiếng Anh.
- Phạm vi: shell (sidebar, header, project toolbar, filter bar) + tab **Bảng** (Kanban replica) + tab **Backlog** = Product Backlog section với **thanh tab phụ**.
- Chi tiết item: **drawer bên phải**.

## Stack & thư viện
`zustand` (+ `persist` middleware, có `version` để migrate/reset) · `@dnd-kit/core` + `@dnd-kit/sortable` (kéo thả rank, Kanban, sprint) · `recharts` (velocity, burndown, phân phối, ma trận scatter) · `@tabler/icons-react` (đúng style icon CRM) · `date-fns` · font Inter · CSS thuần với tokens trên `:root` (dark theme, hex lấy từ phân tích screenshot) · `vitest` cho `lib/` tính điểm.

## Cấu trúc thư mục
```
app/src/
  theme/tokens.css            # màu, radius, spacing từ spec (bg #171717, card #222, accent #3b6ef5, status/priority/label colors)
  data/types.ts               # Issue, Epic, Sprint, Member, Label, Status, GroomingSession, Idea, Settings…
  data/seed.ts                # 44 issue + 17 member FRAUD + 6 status + label + epic + sprint demo
  store/useStore.ts           # zustand persist; actions: updateIssue, reorder, moveStatus, sprint ops, scoring…
  lib/prioritization/         # 1 file / method, interface chung (xem dưới) + index registry
  lib/readiness.ts            # DoR, INVEST, DEEP checks
  lib/metrics.ts              # velocity, burndown, health scorecard
  components/shell/           # Sidebar, PageHeader, ProjectToolbar, FilterBar, SprintBanner
  components/ui/              # StatusIcon, PriorityIcon, TypeIcon, Avatar(+Stack), Chip, LabelChip, DateChip, Button, Tabs, Drawer, Modal
  components/issue/IssueDrawer.tsx
  views/board/KanbanBoard.tsx
  views/backlog/BacklogSection.tsx   # thanh tab phụ + router nội bộ (hash: #/backlog/<tab>)
  views/backlog/{List,Prioritization,Grooming,SprintPlanning,Review,Insights,Ideas,Settings}View.tsx
```

## Data model chính (Issue)
key, title, type (Epic/Story/Task/Bug/Spike/Tech debt/Improvement), status (6 status Fraud), priority (Urgent/High/Medium/Low), labels, epicId, assignee/reporter, dueDate, createdAt/updatedAt, **rank**, sprintId, storyPoints, tshirt (S/M/L), userStory {asA, iWant, soThat}, description, acceptanceCriteria[] (checkbox), dorChecks, dodChecks, investChecks, **dependencies** {blockedBy[], blocks[]}, bugSeverity (Critical/Important/Less critical), strategicGoalId, source (paying/trial/lead/internal/investor), whyNow, successMetric, **scores: Record<methodId, inputs>**, scoreReasoning, estimateVotes[] (planning poker), lastGroomedAt.

## Các tab phụ trong tab Backlog
1. **Danh sách** — replica đúng tab Backlog hiện tại ("+ Tạo sprint", group "Backlog · Issue chưa thuộc sprint nào · N issue", hàng priority·status·key·title·label·due·avatar, "Còn N issue") + thêm: nhóm theo sprint (active/planned) phía trên, kéo thả rank, cột điểm + badge phase/bucket, story point, chấm readiness (DoR %), icon blocked, quick create inline (Enter tạo tiếp). Toggle chế độ xem: **List** / **Buckets** (P1 = sprint tới, P2 ≈ 3 tháng, Longer-term, Bugs — ProductPlan) / **Story map** (epic theo cột, item chưa có epic ở panel phải, swimlane theo sprint).
2. **Ưu tiên** — chọn method (lưu điểm riêng theo method, đổi method không mất dữ liệu):
   - **SAE ICE × CAF (mặc định)**: I/C/E 1–10, đối thủ N dòng {tên, Direct 1.5/Indirect 1.0, Adoption No 0/Basic 0.7/Good 1.0/Advanced 1.3}; `ICE=I·C·E`, `CAF=Σ(a·w)/Σw` (0 nếu không có đối thủ), `Final=ICE·(1+CAF)`; Phase 1 >300 · 2 200–300 · 3 100–<200 · 4 <100; hiển thị "+X% competitor boost".
   - **ICE**, **RICE** (Reach·Impact·Confidence/Effort), **WSJF** (CoD=BV+TC+RROE, /Job Size, gợi ý category factors, khuyến nghị chấm từng cột), **MoSCoW** (gắn nhãn hoặc stakeholder vote 10/7/3/0 có cảnh báo hoà điểm + voter không phân biệt), **Risk/Value** (2×2, thứ tự 1→2→3→?, map MoSCoW), **Value vs Effort** (2×2 quick wins/big bets/fill-ins/time sinks), **Kano** (Must-be/Performance/Attractive/Indifferent/Reverse), **20/20 force-rank** (dialog A vs B, insertion sort).
   - Lưới chấm điểm inline + cột Score reasoning + rank; panel trực quan theo method (phân phối phase, ma trận scatter, bảng vote). Nút "Áp dụng thứ tự vào backlog". Nhắc anti-pattern (HiPPO, Squeaky wheel, Hot potato).
3. **Grooming** — danh sách session + tạo session (ngày, facilitator, attendees, goal, agenda chọn từ top backlog, prep checklist từ PDF, mục tiêu 45–60'); **chế độ chạy session**: hàng đợi agenda, timer session + timer từng story, các thao tác: viết lại user story (As a/I want/so that), AC, tách story / chuyển thành epic, **planning poker** (mỗi người vote + lý do, chọn majority/average), đánh dấu Ready, xoá item lỗi thời; tổng kết session (added/removed/split/estimated/reprioritized). Panel readiness: **INVEST** + **DoR** từng item, hàng đợi "Cần grooming" (top 2–3 sprint chưa Ready).
4. **Sprint Planning** — sprint list; plan sprint: capacity theo member, gợi ý theo **velocity** TB 3 sprint, template sprint goal ("Mục tiêu là … Cần … item. Capacity … Vì vậy …"), 2 cột Backlog (Ready lên đầu) → Sprint bằng kéo thả, thanh capacity, cảnh báo DoR chưa đạt và **dependency chưa xong**; Start sprint (khoá scope, thay đổi ghi nhận là scope change); Complete sprint → dialog carry-over (sang sprint sau / về backlog).
5. **Review** — (a) Backlog review định kỳ: checklist PM (item mới, tổ chức, vision alignment, đánh giá lại P1/P2), item stale >6 tháng, item thiếu goal/"why"; (b) Sprint review: item done, kiểm tra **DoD** + success metric, ghi feedback stakeholder; (c) Retro: Went well / Went wrong / Learned / Improve + action items.
6. **Insights** — velocity chart (committed vs completed), **burndown** sprint đang chạy (ideal vs actual), **DEEP** scorecard, health: số lượng/xu hướng, % Ready của top 2 sprint, chưa estimate, quá lớn, stale, không gắn goal, blocked, phân phối phase/bug severity.
7. **Ideas** — inbox / parking lot (COPE: Capture): nguồn, số lần được yêu cầu, quote khách; intake gate (Vì sao có ở đây? Có hỗ trợ "why" của sản phẩm? Có dữ liệu chứng minh? Hợp vision?) → promote vào backlog / parking lot / reject.
8. **Thiết lập** — vision statement + strategic goals (màu), DoR/DoD checklist sửa được, method mặc định, bảng trọng số CAF + ngưỡng phase, điểm MoSCoW, stakeholders, đối thủ, reset dữ liệu demo.

**IssueDrawer** (dùng chung Danh sách/Bảng/Ưu tiên/Grooming/Sprint): header key+type+status, user story, mô tả, AC, điểm theo method đang chọn, estimate + votes, DoR/INVEST/DoD checklist, dependencies (blocked by/blocks, chọn issue), epic/goal/labels/sprint/assignee/due, why-now, success metric, activity log.

**Tab Bảng** — replica Kanban: 6 cột đúng màu/icon, card anatomy đúng spec, "Còn N issue", kéo thả đổi status, banner sprint (hiện sprint đang chạy hoặc "No active sprint…"), "4 of 44 done", click card mở drawer.

## Interface chung cho method ưu tiên
```ts
interface PrioritizationMethod<I> {
  id: string; name: string; description: string;
  fields: FieldDef[];                    // render form/lưới tự động
  compute(inputs: I, ctx): number | null; // null = chưa đủ input
  classify?(score, inputs, ctx): { label: string; color: string };
  visual?: 'phase' | 'matrix' | 'votes' | 'kano' | 'pairwise';
}
```

## Thứ tự làm (check-in với user sau mỗi bước)
1. Scaffold + tokens + shell + tab Bảng + tab Danh sách replica (so với screenshot) → **check-in**.
2. Store/seed hoàn chỉnh + IssueDrawer + kéo thả rank.
3. Ưu tiên (9 method) + vitest cho `lib/prioritization` → **check-in**.
4. Grooming + readiness (DoR/INVEST/DEEP) + planning poker → **check-in**.
5. Sprint Planning + Insights (velocity/burndown/health) → **check-in**.
6. Review + Ideas + Thiết lập + polish.

Câu hỏi sẽ hỏi trong lúc code: màu label "Documentation" (không thấy trên screenshot), tên đối thủ Fraud thật, DoR/DoD mẫu của team, độ dài sprint chuẩn.

## Verification
- `npm run build` (tsc + vite) không lỗi; `npx vitest run` cho method: CAF ví dụ xlsx (BON Direct Good, CASA Direct Basic, Smile Indirect No → 0.6375), MoSCoW tổng bảng PDF (Feature 2 = 43), WSJF (CoD/JobSize), ngưỡng phase biên 100/200/300.
- `npm run dev` chạy nền, `open http://localhost:5173`; chụp màn hình headless bằng Playwright (đã cài trong `crm-backlog`) trang Bảng + Danh sách, đặt cạnh `quan-ly-cong-viec/01-bang/01.png`, `01b-bang-backlog/01.png` để so độ giống.
- Click-through từng tab phụ: chấm điểm → áp dụng thứ tự; tạo session grooming → poker → Ready; plan sprint → start → complete → carry-over; reload trang giữ dữ liệu; Reset khôi phục seed.
