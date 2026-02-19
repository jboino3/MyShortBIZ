import { Routes, Route } from "react-router-dom";
import Layout from "./Misc/Layout";

// Home 
import Home from "./Home/Home"; 


// Primary pages 
import About from "./pages/About";
import Features from "./pages/Features";
import Solutions from "./pages/Solutions";
import Pricing from "./pages/Pricing";
import Resources from "./pages/Resources";
import Contact from "./pages/Contact";


// Extra sections using existing folder names (each should export a default page component)
import CreatorHome from "./CreatorHome/CreatorHome";
import Shop from "./CreatorHome/Shop";
import Store from "./CreatorHome/Store";
import Studio from "./CreatorHome/Studio";
import Blog from "./CreatorHome/Blog";
import Social from "./CreatorHome/Social";
// import LinkPage from "./CreatorHome/Link";    
import Video from "./CreatorHome/Video";
import Thesis from "./CreatorHome/Thesis";
import CV from "./CreatorHome/CV";
import Bio from "./CreatorHome/Bio";
import Misc from "./Misc/Misc";
import SignIn from "./AccountCreationAndPayment/SignIn";
import Register from "./AccountCreationAndPayment/Register";
import HelpAndContact from "./Misc/HelpAndContact";
import Settings from "./CreatorHome/Settings";


// Links Pages
import LinkLayout from "./Link/Layout";
import Dashboard from "./Link/Dashboard";
import LinkNotes from "./Link/Notes";
import LinkAnalytics from "./Link/Analytics";
import LinkVerification from "./Link/Verification";
import LinkSettings from "./Link/Settings";
// import LinksLayout from "./Link/Layout";
// import Link from "./Link/Link";
// import LinkNotes from "./Link/Notes";
// import LinkAnalytics from "./Link/Analytics";
// import LinkVerification from "./Link/Verification";
// import LinkSettings from "./Link/Settings";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />

        {/* Primary menu */}
        <Route path="/about" element={<About />} />
        <Route path="/features" element={<Features />} />
        <Route path="/solutions" element={<Solutions />} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/resources" element={<Resources />} />
        <Route path="/contact" element={<Contact />} />

        {/* Sign In and Account Management */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/register" element={<Register />} />
        <Route path="/help" element={<HelpAndContact />} />

        {/* More */}
        <Route path="/creator" element={<CreatorHome />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/store" element={<Store />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/social" element={<Social />} />
        {/* <Route path="/link" element={<LinkPage />} /> */}
        <Route path="/video" element={<Video />} />
        <Route path="/thesis" element={<Thesis />} />
        <Route path="/cv" element={<CV />} />

        <Route path="/bio" element={<Bio />} />
        <Route path="/misc" element={<Misc />} />

        {/* Links */}
        <Route path="/link" element={<LinkLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="notes" element={<LinkNotes />} />
          <Route path="analytics" element={<LinkAnalytics />} />
          <Route path="verification" element={<LinkVerification />} />
          <Route path="settings" element={<LinkSettings />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}
