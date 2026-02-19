// Layout.tsx
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import './style.scss'

export default function LinksLayout() {
  return (
    <div className="link-layout">
      <Sidebar />
      <main className="link-main">
        <Outlet />
      </main>
    </div>
  );
}
