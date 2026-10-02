import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import CashierPage from "./pages/CashierPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import ProtectedRoute from "./components/ProtectedRoute";
import ScrollToTop from "./components/ScrollToTop";
import InstallPrompt from "./components/InstallPrompt";
import GuidedTour from "./components/GuidedTour";
import { TourProvider } from "./contexts/TourContext";

// Login, Kasir and Riwayat are what a cashier opens every shift, so they stay
// in the initial bundle. Everything below is owner-only and rarely opened on
// the tablet — split out so the first paint does not pay for recharts, jsPDF
// or ExcelJS. Each becomes its own chunk, fetched on first visit and cached.
const MenuManagePage = lazy(() => import("./pages/MenuManagePage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const VoidRequestsPage = lazy(() => import("./pages/VoidRequestsPage"));
const AuditLogPage = lazy(() => import("./pages/AuditLogPage"));
const BranchManagePage = lazy(() => import("./pages/BranchManagePage"));
const UserManagePage = lazy(() => import("./pages/UserManagePage"));

// Shown only while a lazy page's chunk is in flight — deliberately quiet so a
// fast local load does not flash a spinner at the user.
function RouteFallback() {
  return (
    <div className="flex items-center justify-center py-24">
      <span
        className="w-6 h-6 border-2 rounded-full animate-spin"
        style={{ borderColor: "#e2e8f0", borderTopColor: "#1e3a5f" }}
        role="status"
        aria-label="Memuat halaman"
      />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <TourProvider>
        <InstallPrompt />
        <GuidedTour />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <CashierPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/orders"
              element={
                <ProtectedRoute>
                  <OrderHistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/menus"
              element={
                <ProtectedRoute allowedRoles={["owner"]}>
                  <MenuManagePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/void-requests"
              element={
                <ProtectedRoute allowedRoles={["owner"]}>
                  <VoidRequestsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allowedRoles={["owner"]}>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/audit-log"
              element={
                <ProtectedRoute allowedRoles={["owner"]}>
                  <AuditLogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/branches"
              element={
                <ProtectedRoute allowedRoles={["owner"]}>
                  <BranchManagePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={["owner"]}>
                  <UserManagePage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
        {/* After <Routes> so the incoming page is already committed when the
            scroll reset runs. */}
        <ScrollToTop />
      </TourProvider>
    </BrowserRouter>
  );
}

export default App;
