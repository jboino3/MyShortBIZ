import './style.scss'
import { useState } from 'react'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faLinkedin,
  faGithub,
} from '@fortawesome/free-brands-svg-icons'
import {
  faHome,
  faUser,
  faEnvelope,
  faSuitcase,
} from '@fortawesome/free-solid-svg-icons'
import { NavLink } from 'react-router-dom'
{/* <FontAwesomeIcon icon={faHome} color="#4d4d4e" /> */}
const Sidebar = () => {
  const [showNav, setShowNav] = useState(false);

  return (
    <div className="nav-bar">
      <nav className={showNav ? 'mobile-show' : ''}>
        <NavLink to="/" onClick={() => setShowNav(false)}> home </NavLink>
        <NavLink to="/bio" onClick={() => setShowNav(false)}> bio </NavLink>
        <NavLink to="/blog" onClick={() => setShowNav(false)}> blog </NavLink>
        <NavLink to="/cv" onClick={() => setShowNav(false)}> cv </NavLink>
        <NavLink to="/link" onClick={() => setShowNav(false)}> link </NavLink>
        <NavLink to="/shop" onClick={() => setShowNav(false)}> shop </NavLink>
        <NavLink to="/social" onClick={() => setShowNav(false)}> social </NavLink>
        <NavLink to="/store" onClick={() => setShowNav(false)}> store </NavLink>
        <NavLink to="/studio" onClick={() => setShowNav(false)}> studio </NavLink>
        <NavLink to="/interactive" onClick={() => setShowNav(false)}> interactive </NavLink>
        <NavLink to="/video" onClick={() => setShowNav(false)}> video </NavLink>
      </nav>
    </div>
  )
}

export default Sidebar