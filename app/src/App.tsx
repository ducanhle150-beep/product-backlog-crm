import { IconChartBar, IconLayoutKanban, IconListDetails } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Sidebar } from './components/shell/Sidebar';
import { PageHeader, ProjectToolbar } from './components/shell/Toolbar';
import { IssueDrawer } from './components/issue/IssueDrawer';
import { KanbanBoard } from './views/board/KanbanBoard';
import { DeliveryInsights } from './views/board/DeliveryInsights';
import { BacklogSection } from './views/backlog/BacklogSection';
import { PrioritizationView } from './views/backlog/PrioritizationView';
import { SprintPlanningView } from './views/backlog/SprintPlanningView';
import { InsightsView } from './views/backlog/InsightsView';
import { IdeasView } from './views/backlog/IdeasView';
import { SettingsView } from './views/backlog/SettingsView';
import { useStore } from './store/useStore';
import { useHashRoute } from './store/ui';

const VIEWS: Record<string, ReactNode> = {
  prioritize: <PrioritizationView />,
  sprint: <SprintPlanningView />,
  insights: <InsightsView />,
  ideas: <IdeasView />,
  settings: <SettingsView />,
};

export default function App() {
  const [route, go] = useHashRoute();
  const createIssue = useStore((s) => s.createIssue);
  const openIssue = useStore((s) => s.openIssue);
  const activeSprintId = useStore((s) => s.sprints.find((sp) => sp.state === 'active')?.id);
  const page = route[0] === 'board' ? 'board' : 'backlog';
  const boardTab = route[1] === 'insights' ? 'insights' : 'kanban';

  return (
    <div className="app">
      <Sidebar route={route} go={go} />
      <main className="main">
        {page === 'board' ? (
          <PageHeader title="Bảng" icon={<IconLayoutKanban size={17} stroke={1.6} color="#f0543c" />} />
        ) : (
          <PageHeader title="Product Backlog" icon={<IconListDetails size={17} stroke={1.6} color="#3b82f6" />} />
        )}
        <ProjectToolbar
          go={go}
          noun={page === 'board' ? 'issue' : 'item'}
          tabs={
            page === 'board' ? (
              <div className="seg">
                <button className={boardTab === 'kanban' ? 'is-active' : ''} onClick={() => go('board')}><IconLayoutKanban size={16} stroke={1.6} /> Kanban</button>
                <button className={boardTab === 'insights' ? 'is-active' : ''} onClick={() => go('board/insights')}><IconChartBar size={16} stroke={1.6} /> Insights</button>
              </div>
            ) : undefined
          }
          onNewIssue={() => {
            if (page === 'board') createIssue({ title: 'Issue mới', kind: 'task', status: 'planned', sprintId: activeSprintId });
            else openIssue(createIssue({ title: 'Item mới' }).id);
          }}
        />
        {page === 'board' && boardTab === 'kanban' && <KanbanBoard go={go} />}
        {page === 'board' && boardTab === 'insights' && <DeliveryInsights go={go} />}
        {page === 'backlog' && <BacklogSection tab={route[1] ?? 'list'} go={go} views={VIEWS} />}
      </main>
      <IssueDrawer />
    </div>
  );
}
