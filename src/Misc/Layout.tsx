
import { NavLink, Outlet } from "react-router-dom";
import Dropdown from "react-bootstrap/Dropdown";
import "bootstrap/dist/css/bootstrap.min.css";
import "./style.scss";
import logo from "../assets/logo.png.png";

export default function Layout() {
  return (
    <>
      {/* Top utility bar */}
      <div className="topbar">
        <div className="topbar__left">
          <button className="linklike">Sign in</button>
          <button className="linklike">Register</button>
        </div>
        <div className="topbar__right">
          <button className="linklike">Settings</button>
          <button className="linklike">Help &amp; Contact</button>
        </div>
      </div>

      {/* Main nav bar */}
      <header className="mainnav">
        <div className="mainnav__logo">
          <NavLink to="/" aria-label="MyShort.biz Home">
            <img src={logo} alt="MyShort.biz" />
          </NavLink>
        </div>

        <nav className="mainnav__menu" aria-label="Primary">
          <NavLink to="/about" className={({isActive}) => isActive ? "active" : ""}>About us</NavLink>

          <NavLink to="/features" className={({isActive}) => isActive ? "active" : ""}>Features</NavLink>
          <NavLink to="/solutions" className={({isActive}) => isActive ? "active" : ""}>Solutions</NavLink>
          <NavLink to="/pricing" className={({isActive}) => isActive ? "active" : ""}>Pricing</NavLink>
          <NavLink to="/resources" className={({isActive}) => isActive ? "active" : ""}>Resources</NavLink>
          <NavLink to="/contact" className={({isActive}) => isActive ? "active" : ""}>Contact</NavLink>

          <Dropdown align="end">
            <Dropdown.Toggle id="more-dd" className="dd-toggle">More</Dropdown.Toggle>
            <Dropdown.Menu className="dd-menu">
              <Dropdown.Item as={NavLink} to="/creator">Creator Home</Dropdown.Item>
              <Dropdown.Item as={NavLink} to="/shop">Shop</Dropdown.Item>
              <Dropdown.Item as={NavLink} to="/store">Store</Dropdown.Item>
              <Dropdown.Item as={NavLink} to="/studio">Studio</Dropdown.Item>
              <Dropdown.Item as={NavLink} to="/blog">Blog</Dropdown.Item>
              <Dropdown.Item as={NavLink} to="/social">Social</Dropdown.Item>
              <Dropdown.Item as={NavLink} to="/link">Link</Dropdown.Item>
              <Dropdown.Item as={NavLink} to="/video">Video</Dropdown.Item>
              <Dropdown.Item as={NavLink} to="/thesis">Thesis</Dropdown.Item>
              <Dropdown.Item as={NavLink} to="/cv">CV</Dropdown.Item>
              <Dropdown.Item as={NavLink} to="/bio">Bio</Dropdown.Item>
              <Dropdown.Item as={NavLink} to="/misc">Misc</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </nav>
      </header>

      {/* Routed page content */}
      <Outlet />
    </>
  );
}
