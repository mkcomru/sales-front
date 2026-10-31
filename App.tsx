import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './components/Login';
import { Guard } from './components/Guard';
import { SelectCompanyPage } from './components/SelectCompanyPage';
import { OnboardingPage } from './components/OnboardingPage';
import { Workspace } from './components/Workspace';
import { ToastProvider } from './contexts/ToastContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ToastContainer';

// Import Pages
import { InboxPage } from './pages/InboxPage';
import { ProductsPage } from './pages/ProductsPage';
import { SettingsPage } from './pages/SettingsPage';
import { FunnelPage } from './pages/FunnelPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ProfilePage } from './pages/ProfilePage';
import { PublicFormPage } from './pages/PublicFormPage';
import { BillingPage } from './pages/BillingPage';
import { MyTasksPage } from './pages/MyTasksPage';
import { AllTasksPage } from './pages/AllTasksPage';
import { OrderTasksPage } from './pages/OrderTasksPage';
import { OrderTaskPage } from './pages/OrderTaskPage';

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            {/* Public form page - no auth required, like Google Forms */}
            <Route path="/f/:publicId" element={<PublicFormPage />} />
            
            <Route path="/login" element={<Login />} />
            <Route path="/select-company" element={<SelectCompanyPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/:companyId" element={<Workspace />}>
              <Route index element={<Navigate to="inbox" replace />} />
              <Route path="inbox" element={<InboxPage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="funnel" element={<FunnelPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="billing" element={<BillingPage />} />
              <Route path="my-tasks" element={<MyTasksPage />} />
              <Route path="all-tasks" element={<AllTasksPage />} />
              <Route path="orders/:orderId/tasks" element={<OrderTasksPage />} />
              <Route path="orders/:orderId/tasks/:taskId" element={<OrderTaskPage />} />
            </Route>
            <Route path="/" element={<Guard />} />
          </Routes>
          <ToastContainer />
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;