import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import CashierPage from "./pages/CashierPage";
import OrderHistoryPage from "./pages/OrderHistoryPage";
import MenuManagePage from "./pages/MenuManagePage";
import DashboardPage from "./pages/DashboardPage";
import VoidRequestsPage from "./pages/VoidRequestsPage";
import AuditLogPage from "./pages/AuditLogPage";
import ProtectedRoute from "./components/ProtectedRoute";
import InstallPrompt from "./components/InstallPrompt";
import GuidedTour from "./components/GuidedTour";

function App() {
  const [runTour, setRunTour] = useState(false);

  // Tour triggered from MainLayout navbar via custom event
  useEffect(() => {
    const handler = () => setRunTour(true);
    window.addEventListener("app:start-tour", handler);
    return () => window.removeEventListener("app:start-tour", handler);
  }, []);

  return (
    <BrowserRouter>
      <InstallPrompt />
      <GuidedTour run={runTour} onFinish={() => setRunTour(false)} />

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;
