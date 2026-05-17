import api from "./axios";

export const login = (data) => {
  return api.post("/login", data);
};

export const logout = () => {
  return api.post("/logout");
};

export const getUser = () => {
  return api.get("/me");
};
