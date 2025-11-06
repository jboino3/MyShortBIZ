import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";

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
import Shop from "./Shop/Shop";
import Store from "./Store/Store";
import Studio from "./Studio/Studio";
import Blog from "./Blog/Blog";
import Social from "./Social/Social";
import LinkPage from "./Link/Link";    
import Video from "./Video/Video";
import Thesis from "./Thesis/Thesis";
import CV from "./CV/CV";
import Bio from "./Bio/Bio";
import Misc from "./Misc/Misc";

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

        {/* More */}
        <Route path="/creator" element={<CreatorHome />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/store" element={<Store />} />
        <Route path="/studio" element={<Studio />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/social" element={<Social />} />
        <Route path="/link" element={<LinkPage />} />
        <Route path="/video" element={<Video />} />
        <Route path="/thesis" element={<Thesis />} />
        <Route path="/cv" element={<CV />} />
        <Route path="/bio" element={<Bio />} />
        <Route path="/misc" element={<Misc />} />

        {/* Catch-all */}
        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
  );
}
