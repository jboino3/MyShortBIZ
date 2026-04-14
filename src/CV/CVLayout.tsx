import React from "react";
import './style.scss'; // shared styles
import Sidebar from "./Sidebar.tsx";
import { Outlet } from "react-router-dom";

function CVLayout() {
  return (
    <div className="cv-page">
      {/* Sidebar if you ever want it */}
      {/* <Sidebar /> */}

      <main className="cv-page__content">
        <Outlet /> {/* renders child pages like landing or builder */}
      </main>
    </div>
  );
}

export default CVLayout;