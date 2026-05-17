import api from "./axios";

export const getMenus = () => api.get("/menus");
export const getAllMenus = () => api.get("/menus/all");

export const createMenu = (data) => {
  const formData = new FormData();
  formData.append("category_id", data.category_id);
  formData.append("name", data.name);
  if (data.price !== null && data.price !== undefined)
    formData.append("price", data.price);
  if (data.image) formData.append("image", data.image);
  if (data.variants) formData.append("variants", JSON.stringify(data.variants));

  return api.post("/menus", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const updateMenu = (id, data) => {
  const formData = new FormData();
  formData.append("_method", "PUT");
  if (data.category_id !== undefined)
    formData.append("category_id", data.category_id);
  if (data.name !== undefined) formData.append("name", data.name);
  if (data.price !== null && data.price !== undefined)
    formData.append("price", data.price);
  if (data.is_available !== undefined)
    formData.append("is_available", data.is_available ? "1" : "0");
  if (data.image) formData.append("image", data.image);
  if (data.variants) formData.append("variants", JSON.stringify(data.variants));

  return api.post(`/menus/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const deleteMenu = (id) => api.delete(`/menus/${id}`);
export const getCategories = () => api.get("/categories");
