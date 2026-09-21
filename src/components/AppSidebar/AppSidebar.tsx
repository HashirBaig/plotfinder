import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, LogOut } from "lucide-react";
import { cn } from "../../lib/utils";
import vegBasketLogo from "@/assets/mealcart/veg_basket.png";

function Sidebar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/login");
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
      isActive
        ? "bg-lime-900/40 text-lime-400"
        : "text-gray-400 hover:bg-gray-900 hover:text-gray-200",
    );

  return (
    <aside className="fixed left-0 top-0 z-50 flex flex-col justify-between w-64 h-screen border-r border-gray-800 bg-gray-950 px-4 py-6 shrink-0">
      <div>
        <div className="flex items-center mb-8 gap-2">
          <img
            src={vegBasketLogo}
            alt="logo"
            className="w-20 h-auto cursor-pointer"
          />
          <h1 className="text-lg font-bold px-4 text-gray-100">Meal Cart</h1>
        </div>

        <nav className="space-y-1">
          <NavLink to="/admin" end className={navLinkClasses}>
            <LayoutDashboard className="size-5" />
            Dashboard
          </NavLink>

          <NavLink to="/users" className={navLinkClasses}>
            <Users className="size-5" />
            Users
          </NavLink>
        </nav>
      </div>

      <div className="border-t border-gray-800 pt-4 px-4">
        <p className="text-sm font-medium truncate"></p>
        <p className="text-xs text-gray-500 mb-3 capitalize"></p>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-sm cursor-pointer text-gray-400 hover:text-red-400 transition-colors"
        >
          <LogOut className="size-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
