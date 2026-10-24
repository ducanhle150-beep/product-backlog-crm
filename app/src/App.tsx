import { IconLayoutKanban } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { Sidebar } from './components/shell/Sidebar';
import { PageHeader, ProjectToolbar } from './components/shell/Toolbar';
import { IssueDrawer } from './components/issue/IssueDrawer';
import { KanbanBoard } from './views/board/KanbanBoard';
import { BacklogSection } from './views/backlog/BacklogSection';
import { PrioritizationView } from './views/backlog/PrioritizationView';
import { GroomingView } from './views/backlog/GroomingView';
import { SprintPlanningView } from './views/backlog/SprintPlanningView';
import { InsightsView } from './views/backlog/InsightsView';
import { ReviewView } from './views/backlog/ReviewView';
import { IdeasView } from './views/backlog/IdeasView';
import { SettingsView } from './views/backlog/SettingsView';
import { useStore } from './store/useStore';
import { useHashRoute } from './store/ui';

const VIEWS: Record<string, ReactNode> = {
  prioritize: <PrioritizationView />,
  grooming: <GroomingView />,
  sprint: <SprintPlanningView />,
  insights: <InsightsView />,
  review: <ReviewView />,
  ideas: <IdeasView />,
  settings: <SettingsView />,
};

export default function App() {
  const [route, go] = useHashRoute();
  const createIssue = useStore((s) => s.createIssue);
  const openIssue = useStore((s) => s.openIssue);
  const tab = route[0] === 'board' ? 'board' : 'backlog';

  return (
    <div className="app">
      <Sidebar route={route} go={go} />
      <main className="main">
        <PageHeader title="Bảng" icon={<IconLayoutKanban size={17} stroke={1.6} color="#f0543c" />} />
        <ProjectToolbar tab={tab} go={go} onNewIssue={() => openIssue(createIssue({ title: 'Issue mới' }).id)} />
        {tab === 'board' ? <KanbanBoard go={go} /> : <BacklogSection tab={route[1] ?? 'list'} go={go} views={VIEWS} />}
      </main>
      <IssueDrawer />
    </div>
  );
}
