import api from "./axios";

export const createOrder = (data) => api.post("/orders", data);
export const getOrders = (date, status) =>
  api.get("/orders", { params: { date, status } });
export const getOrder = (id) => api.get(`/orders/${id}`);
export const requestVoid = (id, reason) =>
  api.post(`/orders/${id}/void-request`, { void_reason: reason });
export const getVoidRequests = () => api.get("/void-requests");
export const approveVoid = (id) => api.post(`/orders/${id}/void-approve`);
export const rejectVoid = (id) => api.post(`/orders/${id}/void-reject`);
