import { LandingPage } from './features/workbench/LandingPage';
import ReadingWorkspace from './ReadingWorkspace';
import { Workbench } from './features/workbench/Workbench';
import './features/workbench/workbench.css';

export default function App() {
  const params = new URLSearchParams(location.search);
  if (params.get('page') === 'landing') return <LandingPage />;
  return params.get('view') === 'history' ? <ReadingWorkspace /> : <Workbench />;
}
