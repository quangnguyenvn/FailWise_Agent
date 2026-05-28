import React from 'react';
import { createRoot } from 'react-dom/client';
import FailWiseApp from './FailWiseDashboard';
import './styles.css';
import 'reactflow/dist/style.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <FailWiseApp />
  </React.StrictMode>,
);
