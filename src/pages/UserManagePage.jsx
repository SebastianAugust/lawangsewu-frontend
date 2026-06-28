import { useState, useEffect } from "react";
import { getUsers, createUser, updateUser } from "../api/user";
import MainLayout from "../layouts/MainLayout";
import {
  Store,
  Plus,
  Pencil,
  X,
  UserRound,
  CheckCircle2,
  Power,
  Inbox,
} from "lucide-react";

function UserManagePage() {
  const [users, setUsers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // user object when editing
  const [branchName, setBranchName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const loadUsers = () => {
    getUsers().then((res) => setUsers(res.data));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setBranchName("");
    setName("");
    setEmail("");
    setPassword("");
    setShowForm(true);
  };

  const openEdit = (user) => {
    setEditing(user);
    setBranchName(user.branch?.name || "");
    setName(user.name || "");
    setEmail(user.email || "");
    setPassword("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!branchName.trim()) return alert("Nama cabang harus diisi");
    if (!name.trim()) return alert("Nama kasir harus diisi");
    if (!email.trim()) return alert("Email harus diisi");
    if (!editing && !password) return alert("Password harus diisi");
    setSaving(true);
    try {
      if (editing) {
        const payload = {
          branch_name: branchName.trim(),
          name: name.trim(),
          email: email.trim(),
        };
        if (password) payload.password = password;
        await updateUser(editing.id, payload);
      } else {
        await createUser({
          branch_name: branchName.trim(),
          name: name.trim(),
          email: email.trim(),
          password,
        });
      }
      closeForm();
      loadUsers();
    } catch (err) {
      const errors = err.response?.data?.errors;
      const first = errors ? Object.values(errors)[0]?.[0] : null;
      alert(first || err.response?.data?.message || "Gagal menyimpan data");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user) => {
    const action = user.is_active ? "nonaktifkan" : "aktifkan";
    if (
      !window.confirm(
        `Yakin ${action} cabang "${user.branch?.name || user.name}"? ${
          user.is_active
            ? "Kasir tidak akan bisa login, tapi transaksinya tetap tersimpan."
            : "Kasir akan bisa login kembali."
        }`,
      )
    )
      return;
    try {
      await updateUser(user.id, { is_active: !user.is_active });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || "Gagal mengubah status");
    }
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
          <div>
            <h2 className="font-display text-3xl font-bold text-slate-900 tracking-tight">
              Kelola User
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Setiap cabang punya satu akun kasir. Tambah cabang baru sekaligus
              akunnya, atau nonaktifkan yang tidak dipakai.
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

        {/* List */}
        {users.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200/70 p-16 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-7 h-7 text-slate-300" />
            </div>
            <p className="text-slate-700 font-semibold">Belum ada cabang</p>
            <p className="text-slate-400 text-sm mt-1">
              Tambahkan cabang & akun kasir pertama untuk memulai.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-md transition px-5 py-4 flex items-center gap-4"
              >
                <div className="w-11 h-11 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shrink-0">
                  <Store className="w-5 h-5 text-blue-900" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 truncate">
                      {user.branch?.name || "Cabang belum diberi nama"}
                    </p>
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        user.is_active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {user.is_active ? (
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
                    <UserRound className="w-3 h-3 shrink-0" />
                    {user.name}
                    <span className="text-slate-300">·</span>
                    {user.email}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEdit(user)}
                    title="Edit cabang & akun"
                    className="w-9 h-9 flex items-center justify-center text-slate-500 hover:text-blue-900 hover:bg-slate-100 rounded-lg transition"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => toggleActive(user)}
                    title={user.is_active ? "Nonaktifkan" : "Aktifkan"}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg transition ${
                      user.is_active
                        ? "text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                        : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                    }`}
                  >
                    <Power className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
              <h3 className="font-display font-bold text-slate-900">
                {editing ? "Edit Cabang & Akun" : "Tambah Cabang & Akun"}
              </h3>
              <button
                onClick={closeForm}
                className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* noValidate: jangan biarkan HTML5 memblokir submit secara diam-diam.
                Validasi & pesan error ditangani eksplisit di handleSubmit. */}
            <form onSubmit={handleSubmit} noValidate className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Nama Cabang
                </label>
                <input
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="Lawang Sewu Pandanaran"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-900/10 focus:border-blue-900 transition"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Nama Kasir
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Budi Santoso"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-900/10 focus:border-blue-900 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kasir@lawangsewu.com"
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-900/10 focus:border-blue-900 transition"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Password{" "}
                  {editing && (
                    <span className="normal-case tracking-normal text-slate-400 font-normal">
                      (kosongkan jika tidak diubah)
                    </span>
                  )}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editing ? "••••••" : "Minimal 6 karakter"}
                  className="w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-900/10 focus:border-blue-900 transition"
                  required={!editing}
                />
              </div>
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

export default UserManagePage;
