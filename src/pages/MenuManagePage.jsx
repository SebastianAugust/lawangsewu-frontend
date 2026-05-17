import { useState, useEffect } from "react";
import {
  getAllMenus,
  createMenu,
  updateMenu,
  deleteMenu,
  getCategories,
} from "../api/menu";
import MainLayout from "../layouts/MainLayout";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Tag,
  UtensilsCrossed,
  Search,
  Layers,
  Save,
} from "lucide-react";

function MenuManagePage() {
  const [menus, setMenus] = useState([]);
  const [categories, setCategories] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [form, setForm] = useState({
    category_id: "",
    name: "",
    price: "",
    hasVariants: false,
    variants: [],
  });

  const loadData = () => {
    getAllMenus().then((res) => setMenus(res.data));
    getCategories().then((res) => setCategories(res.data));
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setForm({
      category_id: "",
      name: "",
      price: "",
      hasVariants: false,
      variants: [],
    });
    setEditingMenu(null);
    setShowForm(false);
  };

  const addVariantRow = () => {
    setForm({ ...form, variants: [...form.variants, { name: "", price: "" }] });
  };

  const updateVariantRow = (index, field, value) => {
    const updated = form.variants.map((v, i) =>
      i === index ? { ...v, [field]: value } : v,
    );
    setForm({ ...form, variants: updated });
  };

  const removeVariantRow = (index) => {
    setForm({ ...form, variants: form.variants.filter((_, i) => i !== index) });
  };

  const handleSubmit = async () => {
    try {
      const data = {
        category_id: parseInt(form.category_id),
        name: form.name,
      };
      if (form.hasVariants && form.variants.length > 0) {
        data.price = null;
        data.variants = form.variants.map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          name: v.name,
          price: parseInt(v.price),
          is_available: v.is_available !== undefined ? v.is_available : true,
        }));
      } else {
        data.price = parseInt(form.price);
        data.variants = [];
      }
      if (editingMenu) await updateMenu(editingMenu.id, data);
      else await createMenu(data);
      resetForm();
      loadData();
    } catch {
      alert("Gagal menyimpan menu");
    }
  };

  const handleEdit = (menu) => {
    const hasVariants = menu.variants && menu.variants.length > 0;
    setEditingMenu(menu);
    setForm({
      category_id: menu.category_id,
      name: menu.name,
      price: menu.price || "",
      hasVariants: hasVariants,
      variants: hasVariants
        ? menu.variants.map((v) => ({
            id: v.id,
            name: v.name,
            price: v.price,
            is_available: v.is_available,
          }))
        : [],
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Yakin hapus menu ini?")) return;
    await deleteMenu(id);
    loadData();
  };

  const handleToggleAvailable = async (menu) => {
    await updateMenu(menu.id, { is_available: !menu.is_available });
    loadData();
  };

  const filteredMenus = menus.filter((m) => {
    const matchSearch = searchQuery
      ? m.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchCategory = filterCategory
      ? m.category_id === parseInt(filterCategory)
      : true;
    return matchSearch && matchCategory;
  });

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
        <div>
          <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
            Kelola Menu
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Tambah, ubah, atau hapus menu yang tersedia.
          </p>
        </div>
        <button
          onClick={() => (showForm ? resetForm() : setShowForm(true))}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm ${
            showForm
              ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
              : "bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/10"
          }`}
        >
          {showForm ? (
            <>
              <X className="w-4 h-4" />
              Batal
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Tambah Menu
            </>
          )}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm mb-6 overflow-hidden animate-slide-up">
          <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-br from-amber-50/50 to-white flex items-center gap-2">
            <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              {editingMenu ? (
                <Pencil className="w-4 h-4 text-amber-600" />
              ) : (
                <Plus className="w-4 h-4 text-amber-600" strokeWidth={2.5} />
              )}
            </div>
            <h3 className="font-display font-bold text-slate-900">
              {editingMenu ? "Edit Menu" : "Tambah Menu Baru"}
            </h3>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Kategori
                </label>
                <select
                  value={form.category_id}
                  onChange={(e) =>
                    setForm({ ...form, category_id: e.target.value })
                  }
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition"
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Nama Menu
                </label>
                <input
                  type="text"
                  placeholder="Misal: Ayam Goreng Kremes"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition"
                />
              </div>
            </div>

            {/* Variant toggle */}
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-stone-50 hover:bg-stone-100 transition border border-slate-200/50">
              <input
                type="checkbox"
                checked={form.hasVariants}
                onChange={(e) =>
                  setForm({
                    ...form,
                    hasVariants: e.target.checked,
                    variants:
                      e.target.checked && form.variants.length === 0
                        ? [{ name: "", price: "" }]
                        : form.variants,
                    price: e.target.checked ? "" : form.price,
                  })
                }
                className="mt-0.5 w-4 h-4 rounded accent-amber-500"
              />
              <div>
                <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  Menu memiliki varian
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Aktifkan untuk menu dengan beberapa pilihan (misal: Paha/Dada,
                  Panas/Es)
                </p>
              </div>
            </label>

            {form.hasVariants ? (
              <div className="bg-stone-50 rounded-xl p-4 border border-slate-200/50">
                <p className="text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-3">
                  Daftar Varian
                </p>
                <div className="space-y-2">
                  {form.variants.map((variant, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nama varian (Paha, Dada, ...)"
                        value={variant.name}
                        onChange={(e) =>
                          updateVariantRow(index, "name", e.target.value)
                        }
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                      />
                      <div className="relative w-36">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-medium">
                          Rp
                        </span>
                        <input
                          type="number"
                          placeholder="0"
                          value={variant.price}
                          onChange={(e) =>
                            updateVariantRow(index, "price", e.target.value)
                          }
                          className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                        />
                      </div>
                      <button
                        onClick={() => removeVariantRow(index)}
                        className="w-9 h-9 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg transition shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={addVariantRow}
                  className="mt-3 text-amber-600 hover:text-amber-700 text-xs font-semibold flex items-center gap-1.5 hover:bg-amber-50 px-2 py-1 rounded-md transition"
                >
                  <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                  Tambah varian
                </button>
              </div>
            ) : (
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                  Harga
                </label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-500 font-semibold">
                    Rp
                  </span>
                  <input
                    type="number"
                    placeholder="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              >
                Batal
              </button>
              <button
                onClick={handleSubmit}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-sm shadow-emerald-500/20"
              >
                <Save className="w-4 h-4" />
                {editingMenu ? "Simpan Perubahan" : "Simpan Menu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search & filter */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition"
        >
          <option value="">Semua kategori</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Empty state */}
      {filteredMenus.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-16 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="w-7 h-7 text-slate-300" />
          </div>
          <p className="text-slate-700 font-semibold">Belum ada menu</p>
          <p className="text-slate-400 text-sm mt-1">
            Tambahkan menu pertama untuk mulai berjualan.
          </p>
        </div>
      )}

      {/* Card list — visible on <lg */}
      {filteredMenus.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:hidden">
          {filteredMenus.map((menu) => (
            <div
              key={menu.id}
              className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-4"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 bg-gradient-to-br from-amber-100 to-amber-200 rounded-xl flex items-center justify-center shrink-0">
                  <UtensilsCrossed className="w-5 h-5 text-amber-700" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{menu.name}</p>
                  <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium mt-1">
                    <Tag className="w-3 h-3" />
                    {menu.category?.name}
                  </span>
                </div>
                <button
                  onClick={() => handleToggleAvailable(menu)}
                  className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full transition shrink-0 ${
                    menu.is_available
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-rose-100 text-rose-700"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      menu.is_available ? "bg-emerald-500" : "bg-rose-500"
                    }`}
                  />
                  {menu.is_available ? "Tersedia" : "Habis"}
                </button>
              </div>
              <div className="bg-stone-50 rounded-xl p-3 mb-3">
                {menu.variants && menu.variants.length > 0 ? (
                  <div className="space-y-1">
                    {menu.variants.map((v) => (
                      <div
                        key={v.id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span className="font-medium text-slate-700">{v.name}</span>
                        <div className="flex items-center gap-2">
                          {!v.is_available && (
                            <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                              HABIS
                            </span>
                          )}
                          <span className="text-slate-700 font-semibold">
                            Rp {v.price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center font-display font-bold text-slate-900">
                    Rp {menu.price?.toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(menu)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-2.5 rounded-xl text-sm font-semibold transition"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(menu.id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-2.5 rounded-xl text-sm font-semibold transition"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Hapus
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Table — visible on lg+ */}
      {filteredMenus.length > 0 && (
        <div className="hidden lg:block bg-white rounded-2xl border border-slate-200/70 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-stone-50">
              <tr>
                <th className="text-left px-5 py-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Menu
                </th>
                <th className="text-left px-5 py-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Kategori
                </th>
                <th className="text-left px-5 py-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Harga / Varian
                </th>
                <th className="text-left px-5 py-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-5 py-3 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMenus.map((menu) => (
                <tr
                  key={menu.id}
                  className="border-t border-slate-100 hover:bg-stone-50/50 transition"
                >
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-amber-100 to-amber-200 rounded-lg flex items-center justify-center shrink-0">
                        <UtensilsCrossed className="w-4 h-4 text-amber-700" />
                      </div>
                      <p className="font-semibold text-slate-800">{menu.name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                      <Tag className="w-3 h-3" />
                      {menu.category?.name}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    {menu.variants && menu.variants.length > 0 ? (
                      <div className="space-y-0.5">
                        {menu.variants.map((v) => (
                          <p key={v.id} className="text-sm">
                            <span className="font-medium text-slate-700">
                              {v.name}:
                            </span>{" "}
                            <span className="text-slate-600">
                              Rp {v.price.toLocaleString()}
                            </span>
                            {!v.is_available && (
                              <span className="ml-1.5 text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                                HABIS
                              </span>
                            )}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <span className="font-semibold text-slate-800">
                        Rp {menu.price?.toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <button
                      onClick={() => handleToggleAvailable(menu)}
                      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full transition ${
                        menu.is_available
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                          : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          menu.is_available ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                      {menu.is_available ? "Tersedia" : "Habis"}
                    </button>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(menu)}
                        className="w-8 h-8 flex items-center justify-center text-amber-600 hover:bg-amber-50 rounded-lg transition"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(menu.id)}
                        className="w-8 h-8 flex items-center justify-center text-rose-500 hover:bg-rose-50 rounded-lg transition"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </MainLayout>
  );
}

export default MenuManagePage;
