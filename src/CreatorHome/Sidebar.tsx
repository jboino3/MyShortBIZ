// src/components/Sidebar.tsx
import { Link } from 'react-router-dom';
import './Sidebar.scss';

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <nav>
        <ul>
          <li><Link to="/resume-builder">Resume Builder</Link></li>
          <li><Link to="/portfolio-builder">Portfolio Builder</Link></li>
          <li><Link to="/projects">Projects</Link></li>
        </ul>
      </nav>
    </aside>
  );
}
