import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import CashierPage from "./pages/CashierPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import MenuManagePage from "./pages/MenuManagePage";
import DashboardPage from "./pages/DashboardPage";
import VoidRequestsPage from "./pages/VoidRequestsPage";
import AuditLogPage from "./pages/AuditLogPage";
import BranchManagePage from "./pages/BranchManagePage";
import UserManagePage from "./pages/UserManagePage";
import ProtectedRoute from "./components/ProtectedRoute";
import InstallPrompt from "./components/InstallPrompt";
import GuidedTour from "./components/GuidedTour";
import { TourProvider } from "./contexts/TourContext";

function App() {
  return (
    <BrowserRouter>
      <TourProvider>
        <InstallPrompt />
        <GuidedTour />
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
      </TourProvider>
    </BrowserRouter>
  );
}

export default App;
