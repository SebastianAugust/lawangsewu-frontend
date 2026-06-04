import api from "./axios";

// Tour mode: when active, every order created via `createOrder` is marked
// `is_test=true` on the backend so the tour can clean them up afterwards.
export const isTourMode = () =>
  typeof window !== "undefined" && window.__TOUR_MODE__ === true;

export const createOrder = (data) =>
  api.post("/orders", { ...data, is_test: isTourMode() });

// `branchId` only affects owners (a kasir is always scoped to their own
// cabang by the backend). null/undefined means all cabang for owners.
export const getOrders = (date, status, branchId) =>
  api.get("/orders", {
    params: { date, status, branch_id: branchId || undefined },
  });
export const getOrder = (id) => api.get(`/orders/${id}`);
export const requestVoid = (id, reason) =>
  api.post(`/orders/${id}/void-request`, { void_reason: reason });
export const getVoidRequests = () => api.get("/void-requests");
export const approveVoid = (id) => api.post(`/orders/${id}/void-approve`);
export const rejectVoid = (id) => api.post(`/orders/${id}/void-reject`);

// Deletes all is_test=true orders created by the current user.
// Called by GuidedTour on finish to clean up tutorial dummy orders.
export const cleanupTestOrders = () => api.post("/orders/cleanup-test");
