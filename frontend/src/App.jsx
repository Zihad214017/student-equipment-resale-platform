import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Layouts
import MainLayout from './components/layouts/MainLayout';
import DashboardLayout from './components/layouts/DashboardLayout';
import AdminLayout from './components/layouts/AdminLayout';

// Route Guards
import ProtectedRoute from './components/routes/ProtectedRoute';
import AdminRoute from './components/routes/AdminRoute';

// Public Pages
import HomePage from './pages/public/HomePage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import BrowseEquipmentPage from './pages/public/BrowseEquipmentPage';
import EquipmentDetailPage from './pages/public/EquipmentDetailPage';
import SellerPublicProfilePage from './pages/public/SellerPublicProfilePage';
import NotFoundPage from './pages/public/NotFoundPage';

// Buyer Pages
import BuyerDashboardPage from './pages/buyer/BuyerDashboardPage';
import BuyerRequestsPage from './pages/buyer/BuyerRequestsPage';
import BuyerTransactionsPage from './pages/buyer/BuyerTransactionsPage';

// Seller Pages
import SellerDashboardPage from './pages/seller/SellerDashboardPage';
import MyListingsPage from './pages/seller/MyListingsPage';
import AddEquipmentPage from './pages/seller/AddEquipmentPage';
import EditEquipmentPage from './pages/seller/EditEquipmentPage';
import SellerRequestsPage from './pages/seller/SellerRequestsPage';
import SellerTransactionsPage from './pages/seller/SellerTransactionsPage';
import SellerReviewsPage from './pages/seller/SellerReviewsPage';

// Shared Pages
import ProfilePage from './pages/shared/ProfilePage';
import NotificationsPage from './pages/shared/NotificationsPage';

// Admin Pages
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminEquipmentPage from './pages/admin/AdminEquipmentPage';
import AdminCategoriesPage from './pages/admin/AdminCategoriesPage';
import AdminTransactionsPage from './pages/admin/AdminTransactionsPage';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';

function App() {
  return (
    <AuthProvider>
      <NotificationProvider>
        <BrowserRouter>
          <Routes>
            {/* 1. Public Marketplace & Auth Routes */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/equipment" element={<BrowseEquipmentPage />} />
              <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
              <Route path="/sellers/:id" element={<SellerPublicProfilePage />} />
            </Route>

            {/* 2. Authenticated Buyer & Shared Routes */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Navigate to="/buyer/dashboard" replace />} />
              <Route path="/buyer/dashboard" element={<BuyerDashboardPage />} />
              <Route path="/buyer/requests" element={<BuyerRequestsPage />} />
              <Route path="/buyer/transactions" element={<BuyerTransactionsPage />} />

              {/* Seller Hub Routes */}
              <Route path="/seller/dashboard" element={<SellerDashboardPage />} />
              <Route path="/seller/listings" element={<MyListingsPage />} />
              <Route path="/seller/equipment/new" element={<AddEquipmentPage />} />
              <Route path="/seller/equipment/:id/edit" element={<EditEquipmentPage />} />
              <Route path="/seller/requests" element={<SellerRequestsPage />} />
              <Route path="/seller/transactions" element={<SellerTransactionsPage />} />
              <Route path="/seller/reviews" element={<SellerReviewsPage />} />

              {/* Shared User Profile & Notification Routes */}
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
            </Route>

            {/* 3. Administrator Console Routes */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="equipment" element={<AdminEquipmentPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="transactions" element={<AdminTransactionsPage />} />
              <Route path="payments" element={<AdminPaymentsPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
            </Route>

            {/* 4. Fallback 404 Route */}
            <Route element={<MainLayout />}>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;
