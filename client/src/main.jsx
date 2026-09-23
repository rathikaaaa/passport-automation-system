import React from 'react';
import { createRoot } from 'react-dom/client';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import './index.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';

import PublicLayout from './layouts/PublicLayout';
import DashboardLayout from './layouts/DashboardLayout';

import Landing from './pages/Landing';
import { Login, Register } from './pages/Auth';
import Track from './pages/Track';

import {
  ApplicantDashboard,
  NewApplication,
  MyApplications,
  ApplicationDetails,
  Documents,
  Notifications,
  Profile
} from './pages/Applicant';

import {
  AdminDashboard,
  AllApplications,
  Review,
  Users,
  Police,
  Audit
} from './pages/Admin';


function Guard({ children, admin = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (admin && user.role !== 'ADMIN') {
    return <Navigate to="/applicant" replace />;
  }

  if (!admin && user.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  return children;
}


function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>

          <Route element={<PublicLayout />}>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/track" element={<Track />} />
          </Route>


          <Route element={<DashboardLayout />}>

            <Route
              path="/applicant"
              element={
                <Guard>
                  <ApplicantDashboard />
                </Guard>
              }
            />

            <Route
              path="/applicant/apply"
              element={
                <Guard>
                  <NewApplication />
                </Guard>
              }
            />

            <Route
              path="/applicant/applications"
              element={
                <Guard>
                  <MyApplications />
                </Guard>
              }
            />

            <Route
              path="/applicant/applications/:id"
              element={
                <Guard>
                  <ApplicationDetails />
                </Guard>
              }
            />

            <Route
              path="/applicant/documents"
              element={
                <Guard>
                  <Documents />
                </Guard>
              }
            />

            <Route
              path="/applicant/notifications"
              element={
                <Guard>
                  <Notifications />
                </Guard>
              }
            />

            <Route
              path="/applicant/profile"
              element={
                <Guard>
                  <Profile />
                </Guard>
              }
            />


            <Route
              path="/admin"
              element={
                <Guard admin>
                  <AdminDashboard />
                </Guard>
              }
            />

            <Route
              path="/admin/applications"
              element={
                <Guard admin>
                  <AllApplications />
                </Guard>
              }
            />

            <Route
              path="/admin/applications/:id"
              element={
                <Guard admin>
                  <Review />
                </Guard>
              }
            />

            <Route
              path="/admin/users"
              element={
                <Guard admin>
                  <Users />
                </Guard>
              }
            />

            <Route
              path="/admin/police"
              element={
                <Guard admin>
                  <Police />
                </Guard>
              }
            />

            <Route
              path="/admin/audit"
              element={
                <Guard admin>
                  <Audit />
                </Guard>
              }
            />

          </Route>


          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}


createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
);