import { useNavigate, useLocation } from "react-router-dom";

/**
 * Reusable bottom navigation bar.
 *
 * Props:
 * - items: Array<{
 *     label: string,
 *     icon: ReactNode,
 *     path?: string,        // navigates here on click + used for active highlight
 *     onClick?: () => void, // custom handler (takes priority over navigate)
 *     match?: (pathname: string) => boolean, // custom active-state check
 *   }>
 * - className: extra classes for the <nav> wrapper (e.g. responsive visibility)
 */
const BottomNav = ({ items = [], className = "" }) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (!items.length) return null;

  return (
    <nav
      className={`fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-between
        bg-[rgb(var(--bg))] border-t border-[rgb(var(--border))]
        shadow-[0_-2px_10px_rgba(0,0,0,0.04)] ${className}`}
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {items.map((item) => {
        const isActive = item.match
          ? item.match(location.pathname)
          : item.path && location.pathname === item.path;

        return (
          <button
            key={item.label}
            onClick={() =>
              item.onClick ? item.onClick() : item.path && navigate(item.path)
            }
            className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 active:scale-95 transition-transform"
          >
            <span
              className={`flex items-center justify-center w-9 h-9 rounded-xl text-[17px] transition-all duration-200
                ${
                  isActive
                    ? "bg-[rgb(var(--primary))] text-white shadow-sm"
                    : "text-[rgb(var(--text-muted))]"
                }`}
            >
              {item.icon}
            </span>
            <span
              className={`text-[10.5px] font-bold transition-colors duration-200
                ${
                  isActive
                    ? "text-[rgb(var(--primary))]"
                    : "text-[rgb(var(--text-muted))]"
                }`}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
