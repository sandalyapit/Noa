import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ScrollToTop from "components/ScrollToTop";
import ErrorBoundary from "components/ErrorBoundary";
import MainLayout from "components/MainLayout";
import IntegratedDemo from "components/IntegratedDemo";
import NotFound from "pages/NotFound";
import Dashboard from './pages/dashboard';
import SpreadsheetManagement from './pages/spreadsheet-management';
import ConnectSpreadsheet from './pages/connect-spreadsheet';

const Routes = () => {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <MainLayout>
          <RouterRoutes>
            {/* Define your route here */}
            <Route path="/" element={<ConnectSpreadsheet />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/spreadsheet-management" element={<SpreadsheetManagement />} />
            <Route path="/connect-spreadsheet" element={<ConnectSpreadsheet />} />
            <Route path="/demo" element={<IntegratedDemo />} />
            <Route path="*" element={<NotFound />} />
          </RouterRoutes>
        </MainLayout>
      </ErrorBoundary>
    </BrowserRouter>
  );
};

export default Routes;
