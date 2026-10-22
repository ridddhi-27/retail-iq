import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { HomePage } from './pages/HomePage';
import { MainLayout } from './layouts/MainLayout';
import { OverviewPage } from './pages/OverviewPage';
import { SalesAnalyticsPage } from './pages/SalesAnalyticsPage';
import { DemandForecastingPage } from './pages/DemandForecastingPage';
import { InventoryPage } from './pages/InventoryPage';
import { DataManagementPage } from './pages/DataManagementPage';
import { SettingsPage } from './pages/SettingsPage';
import { AboutPage } from './pages/AboutPage';
import { ModelPerformancePage } from './pages/ModelPerformancePage';

export const App: React.FC = () => {
  return (
    <WorkspaceProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<HomePage />} />

          {/* Main Workspace Application */}
          <Route path="/app" element={<MainLayout />}>
            <Route index element={<OverviewPage />} />
            <Route path="analytics" element={<SalesAnalyticsPage />} />
            <Route path="forecasting" element={<DemandForecastingPage />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="data" element={<DataManagementPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="about" element={<AboutPage />} />
            {/* Internal evaluation page kept for transparency check, not linked in main nav */}
            <Route path="model" element={<ModelPerformancePage />} />
          </Route>

          {/* Backwards compatibility aliases */}
          <Route path="/overview" element={<Navigate to="/app" replace />} />
          <Route path="/analytics" element={<Navigate to="/app/analytics" replace />} />
          <Route path="/forecasting" element={<Navigate to="/app/forecasting" replace />} />
          <Route path="/inventory" element={<Navigate to="/app/inventory" replace />} />
          <Route path="/data" element={<Navigate to="/app/data" replace />} />
          <Route path="/settings" element={<Navigate to="/app/settings" replace />} />
          <Route path="/about" element={<Navigate to="/app/about" replace />} />
          <Route path="/model" element={<Navigate to="/app/model" replace />} />

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </WorkspaceProvider>
  );
};

export default App;
