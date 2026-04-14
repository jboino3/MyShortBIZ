import './Link.scss'
import { NavLink } from "react-router-dom";

function Link() {


  return (
    <main className="link-page-layout">

      <aside className="link-sidebar">
        <nav className="link-nav">
          <NavLink to="/link" end className={({isActive}) => isActive ? "active" : ""}>Dashboard</NavLink>
          <NavLink to="/link/notes" className={({isActive}) => isActive ? "active" : ""}>Notes</NavLink>
          <NavLink to="/link/analytics" className={({isActive}) => isActive ? "active" : ""}>Analytics</NavLink>
          <NavLink to="/link/verification" className={({isActive}) => isActive ? "active" : ""}>Verification</NavLink>
          <NavLink to="/link/settings" className={({isActive}) => isActive ? "active" : ""}>Settings</NavLink>
        </nav>

      </aside>

      {/* <div className="dashboard-card">
        <h5 className="eyebrow">MyShort.Link</h5>
        <nav>
          <ul>

            
            <li><a href="/">Home</a></li>
            <li><a href="/link">Links</a></li>
            <li><a href="/notes">Notes</a></li>
            <li><a href="/analytics">Analytics</a></li>
            <li><a href="/verification">Verification</a></li>
            <li><a href="/settings">Settings</a></li>
          </ul>
        </nav>

      </div> */}
\    </main>
  )
}

export default Link
