// Sidebar.tsx
import { NavLink } from "react-router-dom";

export default function Sidebar() {
  return (
    <aside className="link-sidebar">
      <h3>MyShort.Link</h3>
      <nav className="link-nav">
        <NavLink to="/link" end>
          Home
        </NavLink>
        <NavLink to="/link/links" end>
          Links
        </NavLink>
        <NavLink to="/link/notes">
          Disappearing Notes
        </NavLink>
        <NavLink to="/link/analytics">
          Analytics
        </NavLink>
        <NavLink to="/link/verification">
          Blockchain Verification
        </NavLink>
        {/* <NavLink to="/link/settings">
          Settings
        </NavLink> */}
      </nav>
    </aside>
  );
}
