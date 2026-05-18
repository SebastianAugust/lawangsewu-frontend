import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ShoppingCart,
  History,
  UtensilsCrossed,
  Ban,
  ScrollText,
  LayoutDashboard,
  LogOut,
  Coffee,
  HelpCircle,
} from "lucide-react";

function MainLayout({ children }) {
  const role = localStorage.getItem("role");
  const userName = localStorage.getItem("userName");
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("userName");
    navigate("/login");
  };

  const navLinks = [
    { to: "/", label: "Kasir", icon: ShoppingCart, roles: ["kasir", "owner"] },
    { to: "/orders", label: "Riwayat", icon: History, roles: ["kasir", "owner"] },
    { to: "/menus", label: "Menu", icon: UtensilsCrossed, roles: ["owner"] },
    { to: "/void-requests", label: "Void", icon: Ban, roles: ["owner"] },
    { to: "/audit-log", label: "Audit", icon: ScrollText, roles: ["owner"] },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["owner"] },
  ];

  const isActive = (path) => location.pathname === path;
  const initial = (userName || "U").charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-stone-50">
      <nav className="bg-stone-50/85 backdrop-blur-md border-b border-amber-700/15 sticky top-0 z-40">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-4 lg:gap-8 min-w-0">
            <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-700 via-orange-600 to-amber-800 rounded-lg flex items-center justify-center shadow-sm shadow-amber-900/20 group-hover:scale-105 transition relative overflow-hidden">
                <div className="absolute inset-0 bg-batik-rich opacity-30" />
                <Coffee className="relative w-4 h-4 text-amber-50" strokeWidth={2.4} />
              </div>
              <div className="hidden sm:block">
                <p className="font-display font-bold text-[16px] text-amber-900 leading-none tracking-tight">
                  Lawang Sewu
                </p>
                <p className="text-[10px] text-amber-700/70 font-medium mt-1 uppercase tracking-[0.18em]">
                  Restoran &middot; POS
                </p>
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
                      className={`relative flex items-center gap-2 px-2.5 lg:px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                        active
                          ? "text-slate-900 bg-slate-100"
                          : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={2.2} />
                      <span className="hidden lg:inline">{link.label}</span>
                      {active && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 bg-amber-500 rounded-full" />
                      )}
                    </Link>
                  );
                })}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:flex items-center gap-2.5 pr-3 border-r border-slate-200">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-100 to-amber-200 rounded-full flex items-center justify-center">
                <span className="text-amber-700 font-bold text-xs">
                  {initial}
                </span>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-800 leading-none">
                  {userName}
                </p>
                <p className="text-[10px] text-slate-400 capitalize mt-1 font-medium tracking-wide">
                  {role}
                </p>
              </div>
            </div>
            <button
              onClick={() => window.dispatchEvent(new Event("app:start-tour"))}
              title="Mulai Tutorial"
              className="flex items-center gap-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition text-sm px-3 py-2 rounded-lg font-medium"
            >
              <HelpCircle className="w-4 h-4" strokeWidth={2.2} />
              <span className="hidden sm:inline">Tutorial</span>
            </button>
            <button
              onClick={handleLogout}
              title="Logout"
              className="flex items-center gap-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition text-sm px-3 py-2 rounded-lg font-medium"
            >
              <LogOut className="w-4 h-4" strokeWidth={2.2} />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>
      <div className="batik-divider w-full" />
      <main className="p-4 sm:p-6 max-w-screen-2xl mx-auto">{children}</main>
    </div>
  );
}

export default MainLayout;
