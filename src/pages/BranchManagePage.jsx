import { useState, useEffect } from "react";
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
} from "../api/branch";
import MainLayout from "../layouts/MainLayout";
import {
  Store,
  Plus,
  Pencil,
  Trash2,
  X,
  MapPin,
  CheckCircle2,
  Inbox,
} from "lucide-react";

function BranchManagePage() {
  const [branches, setBranches] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // branch object when editing
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadBranches = () => {
    getBranches().then((res) => setBranches(res.data));
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setName("");
    setAddress("");
    setIsActive(true);
    setShowForm(true);
  };

  const openEdit = (branch) => {
    setEditing(branch);
    setName(branch.name || "");
    setAddress(branch.address || "");
    setIsActive(Boolean(branch.is_active));
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert("Nama cabang harus diisi");
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        address: address.trim() || null,
        is_active: isActive,
      };
      if (editing) {
        await updateBranch(editing.id, payload);
      } else {
        await createBranch(payload);
      }
      closeForm();
      loadBranches();
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menyimpan cabang");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (branch) => {
    if (
      !window.confirm(
        `Hapus cabang "${branch.name}"? Data pesanan & kasir lama tidak terhapus, hanya tidak lagi terikat ke cabang ini.`,
      )
    )
      return;
    try {
      await deleteBranch(branch.id);
      loadBranches();
    } catch (err) {
      alert(err.response?.data?.message || "Gagal menghapus cabang");
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
              Kelola Cabang
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Tambah, ubah, atau hapus cabang Lawang Sewu.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Cabang
          </button>
        </div>

        {/* Branch list */}
        {branches.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/70 p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-700 font-semibold">Belum ada cabang</p>
            <p className="text-slate-400 text-sm mt-1">
              Tambahkan cabang pertama Anda untuk memulai.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {branches.map((branch) => (
              <div
                key={branch.id}
                className="bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition px-5 py-4 flex items-center gap-4"
              >
                <div className="w-11 h-11 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5 text-blue-900" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 truncate">
                      {branch.name}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        branch.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {branch.is_active ? (
                        <>
                          <CheckCircle2 className="w-3 h-3" />
                          Aktif
                        </>
                      ) : (
                        "Nonaktif"
                      )}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 shrink-0" />
                    {branch.address || "Alamat belum diisi"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(branch)}
                    title="Edit cabang"
                    className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-blue-900 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(branch)}
                    title="Hapus cabang"
                    className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="backdrop-enter fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="modal-enter bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-display font-bold text-slate-900">
                {editing ? "Edit Cabang" : "Tambah Cabang"}
              </h3>
              <button
                onClick={closeForm}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Nama Cabang
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Lawang Sewu Pusat"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-900/10 focus:border-blue-900 transition"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Alamat
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Jl. Pemuda No. 160, Semarang"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-900/10 focus:border-blue-900 transition"
                />
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-900 focus:ring-blue-900/20"
                />
                <span className="text-sm text-slate-700 font-medium">
                  Cabang aktif
                </span>
              </label>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-900 hover:bg-blue-800 disabled:bg-slate-300 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition"
                >
                  {saving ? "Menyimpan..." : editing ? "Simpan" : "Tambah"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default BranchManagePage;
