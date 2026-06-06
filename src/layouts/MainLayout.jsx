import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  History,
  UtensilsCrossed,
  Ban,
  ScrollText,
  LayoutDashboard,
  LogOut,
  Store,
  HelpCircle,
} from "lucide-react";
import { useTour } from "../contexts/TourContext";

function MainLayout({ children }) {
  const role = localStorage.getItem("role");
  const userName = localStorage.getItem("userName");
  const branchName = localStorage.getItem("branch_name");
  const navigate = useNavigate();
  const location = useLocation();
  const { start: startTour } = useTour();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    localStorage.removeItem("branch_id");
    localStorage.removeItem("branch_name");
    navigate("/login");
  };

  const navLinks = [
    { to: "/", label: "Kasir", icon: ShoppingCart, roles: ["kasir", "owner"] },
    { to: "/orders", label: "Riwayat", icon: History, roles: ["kasir", "owner"] },
    { to: "/menus", label: "Menu", icon: UtensilsCrossed, roles: ["owner"] },
    { to: "/branches", label: "Cabang", icon: Store, roles: ["owner"] },
    { to: "/void-requests", label: "Void", icon: Ban, roles: ["owner"] },
    { to: "/audit-log", label: "Audit", icon: ScrollText, roles: ["owner"] },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner"] },
  ];

  const isActive = (path) => location.pathname === path;
  const initial = (userName || "U").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 h-[52px] flex items-center justify-between gap-3">
          <div className="flex items-center gap-6 lg:gap-10 min-w-0">
            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
              <div
                className="flex items-center justify-center"
                style={{ width: 30, height: 30, background: "#1e3a5f", borderRadius: 8 }}
              >
                <span
                  className="text-white leading-none"
                  style={{ fontSize: 11, fontWeight: 700 }}
                >
                  LS
                </span>
              </div>
              <div className="hidden sm:flex items-baseline gap-1.5">
                <p
                  className="leading-none"
                  style={{ fontSize: 15, fontWeight: 600, color: "#1e293b", letterSpacing: "-0.4px" }}
                >
                  Lawang Sewu
                </p>
                <span
                  className="leading-none"
                  style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8", letterSpacing: "0.5px" }}
                >
                  POS
                </span>
              </div>
            </Link>

            <div className="flex items-center gap-1 overflow-x-auto">
              {navLinks
                .filter((link) => link.roles.includes(role))
                .map((link) => {
                  const Icon = link.icon;
                  const active = isActive(link.to);
                  return (
                    <Link
                      key={link.to}
                      to={link.to}
                      title={link.label}
                      data-tour={`nav-${link.to.replace("/", "") || "kasir"}`}
                      className={`flex items-center gap-2 whitespace-nowrap ${
                        active
                          ? "bg-[#eef2f7] text-[#1e3a5f] font-semibold"
                          : "text-[#94a3b8] hover:text-slate-700 hover:bg-slate-50 font-medium"
                      }`}
                      style={{ fontSize: 12, padding: "5px 12px", borderRadius: 8 }}
                    >
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={2} />
                      <span className="hidden md:inline">{link.label}</span>
                    </Link>
                  );
                })}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <div className="hidden md:flex items-center gap-2.5 pr-3 mr-1 border-r border-slate-200">
              <div className="w-7 h-7 bg-blue-900 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-xs">
                  {initial}
                </span>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-800 leading-none">
                  {userName}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 font-medium uppercase tracking-wider">
                  {role}
                  {role === "kasir" && branchName ? (
                    <span className="normal-case tracking-normal text-slate-400">
                      {" · "}
                      {branchName}
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
            <button
              onClick={startTour}
              title="Mulai Tutorial"
              className="flex items-center gap-1.5 text-slate-500 hover:text-blue-900 hover:bg-slate-100 transition text-sm px-2.5 py-1.5 rounded font-medium"
            >
              <HelpCircle className="w-4 h-4" strokeWidth={2} />
              <span className="hidden sm:inline">Tutorial</span>
            </button>
            <button
              onClick={handleLogout}
              title="Logout"
              className="flex items-center gap-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 transition text-sm px-2.5 py-1.5 rounded font-medium"
            >
              <LogOut className="w-4 h-4" strokeWidth={2} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>
      <main className="p-4 sm:p-6 max-w-screen-2xl mx-auto">{children}</main>
    </div>
  );
}

export default MainLayout;
