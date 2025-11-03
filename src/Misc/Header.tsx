import './style.scss'
import { useState, useRef } from 'react'
import logo from '../assets/logo.png.png'
import Dropdown from 'react-bootstrap/Dropdown'
{/* <FontAwesomeIcon icon={faHome} color="#4d4d4e" /> */ }
export function scrollToRef<T extends HTMLElement = HTMLElement>(
  ref: React.RefObject<T> | null | undefined,
  options?: ScrollIntoViewOptions
): boolean {
  const el = ref?.current;
  if (el && typeof el.scrollIntoView === 'function') {
    try {
      el.scrollIntoView(options ?? { behavior: 'smooth' });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

const Sidebar = () => {
  const [showNav, setShowNav] = useState(false);
const aboutUsRef = useRef(null);
const featuresRef = useRef(null);
const solutionsRef = useRef(null);
const pricingRef = useRef(null);
const resourcesRef = useRef(null);
const contactRef = useRef(null);
  return (
    <div className="nav-bar">
      <button>Sign in</button>
      <button>Register</button>
      <button>Settings</button>
      <button>Help & Contact</button>
      <img src={logo} className='logo' />
      <nav className='header'>
        <section className='dropdowns'>
          <button>about us</button>
          <Dropdown>
            <Dropdown.Toggle variant="success" id="dropdown-basic">
              features
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item href="#/action-1">Action</Dropdown.Item>
              <Dropdown.Item href="#/action-2">Another action</Dropdown.Item>
              <Dropdown.Item href="#/action-3">Something else</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </section>
        <section className='aboutus-section' ref={aboutUsRef}></section>
        <section className='features-section' ref={featuresRef}></section>
        <section className='solutions-section' ref={solutionsRef}></section>
        <section className='pricing-section' ref={pricingRef}></section>
        <section className='resources-section' ref={resourcesRef}></section>
        <section className='contact-section' ref={contactRef}></section>
      </nav>
    </div>
  )
}

export default Sidebar