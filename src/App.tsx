import { LandingPage } from './features/workbench/LandingPage';
import { TypeStudio } from './features/workbench/TypeStudio';
import ReadingWorkspace from './ReadingWorkspace';
import { Workbench } from './features/workbench/Workbench';
import { SystemPage } from './design-system/SystemPage';
import './features/workbench/workbench.css';

export default function App() {
  const params = new URLSearchParams(location.search);
  const page = params.get('page') === 'landing' ? <LandingPage /> : params.get('view') === 'system' ? <SystemPage /> : params.get('view') === 'history' ? <ReadingWorkspace /> : <Workbench />;
  return <>{page}<TypeStudio /></>;
}
