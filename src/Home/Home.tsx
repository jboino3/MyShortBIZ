import './style.scss'
import logo from '../assets/logo.png.png'
import React, { useState, useRef, RefObject } from 'react';
import './style.scss';
import Dropdown from 'react-bootstrap/Dropdown';
export function scrollToRef<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T> | null | undefined,
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
const Home: React.FC = () => {  
    // typed refs
    const aboutUsRef = useRef<HTMLElement | null>(null);
    const featuresRef = useRef<HTMLElement | null>(null);
    const solutionsRef = useRef<HTMLElement | null>(null);
    const pricingRef = useRef<HTMLElement | null>(null);
    const resourcesRef = useRef<HTMLElement | null>(null);
    const contactRef = useRef<HTMLElement | null>(null);

  return (
    <>
      <div className="nav-bar">
        <nav className="header">
      <button>Sign in</button>
      <button>Register</button>
      <button>Settings</button>
      <button>Help &amp; Contact</button>

      {/* image should include alt for accessibility */}
      <img src={logo} className="logo" alt="logo" />
        <section className="dropdowns">
          {/* pass a function to onClick instead of calling it immediately */}
          <button onClick={() => scrollToRef(aboutUsRef)}>about us</button>

          <Dropdown>
            <Dropdown.Toggle variant="success" id="dropdown-basic">
              features
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item href="" onClick={() => scrollToRef(featuresRef)}>Action</Dropdown.Item>
              <Dropdown.Item href="#/action-2">Another action</Dropdown.Item>
              <Dropdown.Item href="#/action-3">Something else</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        <button onClick={() => scrollToRef(solutionsRef)}>solutions</button>
        <button onClick={() => scrollToRef(pricingRef)}>pricing</button>
        <button onClick={() => scrollToRef(resourcesRef)}>resources</button>
        <button onClick={() => scrollToRef(contactRef)}>contact</button>
        </section>
      </nav>
              {/* sections that we'll scroll to */}
        <section className="aboutus-section" ref={aboutUsRef}></section>
        <section className="features-section" ref={featuresRef}></section>
        <section className="solutions-section" ref={solutionsRef}></section>
        <section className="pricing-section" ref={pricingRef}></section>
        <section className="resources-section" ref={resourcesRef}></section>
        <section className="contact-section" ref={contactRef}></section>
    </div>
    <section className='landing'>
    <h1>Power up your conetnt with MyShort.biz tools</h1>
    <h3>utilize our tools to enhance your content creation expereince for yourself and for your fans</h3>
    </section>

    </>
  )
}

export default Home
