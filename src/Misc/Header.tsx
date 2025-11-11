// // Header.tsx
// import React, { useState, useRef, RefObject } from 'react';
// import './style.scss';
// import logo from '../assets/logo.png.png';
// import Dropdown from 'react-bootstrap/Dropdown';

// // FontAwesome (kept as a plain JS comment here)
// // import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
// // /* <FontAwesomeIcon icon={faHome} color="#4d4d4e" /> */

// export function scrollToRef<T extends HTMLElement = HTMLElement>(
//   ref: RefObject<T> | null | undefined,
//   options?: ScrollIntoViewOptions
// ): boolean {
//   const el = ref?.current;
//   if (el && typeof el.scrollIntoView === 'function') {
//     try {
//       el.scrollIntoView(options ?? { behavior: 'smooth' });
//       return true;
//     } catch {
//       return false;
//     }
//   }
//   return false;
// }
function Sidebar(){}
// const Sidebar: React.FC = () => {
//   const [showNav, setShowNav] = useState(false);

//   // typed refs
//   const aboutUsRef = useRef<HTMLElement | null>(null);
//   const featuresRef = useRef<HTMLElement | null>(null);
//   const solutionsRef = useRef<HTMLElement | null>(null);
//   const pricingRef = useRef<HTMLElement | null>(null);
//   const resourcesRef = useRef<HTMLElement | null>(null);
//   const contactRef = useRef<HTMLElement | null>(null);

//   return (
//     <div className="nav-bar">
//       <button>Sign in</button>
//       <button>Register</button>
//       <button>Settings</button>
//       <button>Help &amp; Contact</button>

//       {/* image should include alt for accessibility */}
//       <img src={logo} className="logo" alt="logo" />

//       <nav className="header">
//         <section className="dropdowns">
//           {/* pass a function to onClick instead of calling it immediately */}
//           <button onClick={() => scrollToRef(aboutUsRef)}>about us</button>

//           <Dropdown>
//             <Dropdown.Toggle variant="success" id="dropdown-basic">
//               features
//             </Dropdown.Toggle>
//             <Dropdown.Menu>
//               <Dropdown.Item href="">Action</Dropdown.Item>
//               <Dropdown.Item href="#/action-2">Another action</Dropdown.Item>
//               <Dropdown.Item href="#/action-3">Something else</Dropdown.Item>
//             </Dropdown.Menu>
//           </Dropdown>
//         </section>

//         {/* sections that we'll scroll to */}
//         <section className="aboutus-section" ref={aboutUsRef}></section>
//         <section className="features-section" ref={featuresRef}></section>
//         <section className="solutions-section" ref={solutionsRef}></section>
//         <section className="pricing-section" ref={pricingRef}></section>
//         <section className="resources-section" ref={resourcesRef}></section>
//         <section className="contact-section" ref={contactRef}></section>
//       </nav>
//     </div>
//   );
// };

export default Sidebar;