import React, { useRef, RefObject } from "react";
import Dropdown from "react-bootstrap/Dropdown";
import "bootstrap/dist/css/bootstrap.min.css"; // make sure bootstrap styles are loaded
import "./style.scss";
import logo from "../assets/logo.png.png"; // confirm this path/filename

export function scrollToRef<T extends HTMLElement = HTMLElement>(
  ref: RefObject<T> | null | undefined,
  options?: ScrollIntoViewOptions
): boolean {
  const el = ref?.current;
  if (el && typeof el.scrollIntoView === "function") {
    try {
      el.scrollIntoView(options ?? { behavior: "smooth", block: "start" });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

const Home: React.FC = () => {
  const aboutUsRef = useRef<HTMLElement | null>(null);
  const featuresRef = useRef<HTMLElement | null>(null);
  const solutionsRef = useRef<HTMLElement | null>(null);
  const pricingRef = useRef<HTMLElement | null>(null);
  const resourcesRef = useRef<HTMLElement | null>(null);
  const contactRef = useRef<HTMLElement | null>(null);

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
          <img src={logo} alt="MyShort.biz" />
        </div>
        <nav className="mainnav__menu" aria-label="Primary">
          <button onClick={() => scrollToRef(aboutUsRef)}>About us</button>

          <Dropdown align="end">
            <Dropdown.Toggle id="features-dd" className="dd-toggle">
              Features
            </Dropdown.Toggle>
            <Dropdown.Menu className="dd-menu">
              <Dropdown.Item onClick={() => scrollToRef(featuresRef)}>
                Action
              </Dropdown.Item>
              <Dropdown.Item>Another action</Dropdown.Item>
              <Dropdown.Item>Something else</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>

          <button onClick={() => scrollToRef(solutionsRef)}>Solutions</button>
          <button onClick={() => scrollToRef(pricingRef)}>Pricing</button>
          <button onClick={() => scrollToRef(resourcesRef)}>Resources</button>
          <button onClick={() => scrollToRef(contactRef)}>Contact</button>
        </nav>
      </header>

      {/* Content */}
      <main className="page">
        <section className="hero">
          <h1>Power up your content with MyShort.biz tools</h1>
          <h3>
            Utilize our tools to enhance your content creation experience for
            yourself and for your fans.
          </h3>
        </section>

        <section className="block aboutus" ref={aboutUsRef}>
          <h2>About us</h2>
          <p>...</p>
        </section>

        <section className="block features" ref={featuresRef}>
          <h2>Features</h2>
          <p>...</p>
        </section>

        <section className="block solutions" ref={solutionsRef}>
          <h2>Solutions</h2>
          <p>...</p>
        </section>

        <section className="block pricing" ref={pricingRef}>
          <h2>Pricing</h2>
          <p>...</p>
        </section>

        <section className="block resources" ref={resourcesRef}>
          <h2>Resources</h2>
          <p>...</p>
        </section>

        <section className="block contact" ref={contactRef}>
          <h2>Contact</h2>
          <p>...</p>
        </section>
      </main>
    </>
  );
};

export default Home;
