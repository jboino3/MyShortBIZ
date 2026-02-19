// Sidebar.tsx
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="link-sidebar">
      <nav className="link-nav">
        <NavLink to="/link" end>
          Dashboard
        </NavLink>
        <NavLink to="/link/notes">
          Notes
        </NavLink>
        <NavLink to="/link/analytics">
          Analytics
        </NavLink>
        <NavLink to="/link/verification">
          Verification
        </NavLink>
        <NavLink to="/link/settings">
          Settings
        </NavLink>
      </nav>
    </aside>
  );
}
