import { Route, Routes } from "react-router-dom";

import { AuthProvider } from "./AccountCreationAndPayment/AuthContext";
import Payment from "./AccountCreationAndPayment/Payment";
import { ProtectedRoute } from "./AccountCreationAndPayment/ProtectedRoute";
import Register from "./AccountCreationAndPayment/Register";
import SignIn from "./AccountCreationAndPayment/SignIn";
import CVBuilder from "./CV/CVBuilder";
import CVLayout from "./CV/CVLayout";
import CVPage from "./CV/CVPage";
import CVPortfolio from "./CV/CVPortfolio";
import Bio from "./CreatorHome/Bio";
import Blog from "./Blog/Blog";
import CreatorHome from "./CreatorHome/CreatorHome";
import Settings from "./CreatorHome/Settings";
import Shop from "./CreatorHome/Shop";
import Social from "./CreatorHome/Social";
import Store from "./CreatorHome/Store";
import Studio from "./CreatorHome/Studio";
import Thesis from "./CreatorHome/Thesis";
import Video from "./CreatorHome/Video";
import Home from "./Home/Home";
import Analytics from "./Link/Analytics";
import BlockchainVerification from "./Link/BlockchainVerification";
import DisappearingNotes from "./Link/DisappearingNotes";
import LinkCreate from "./Link/LinkCreate";
import LinkHome from "./Link/Home";
import LinkLayout from "./Link/Layout";
import Links from "./Link/Links";
import ViewNote from "./Link/ViewNote";
import HelpAndContact from "./Misc/HelpAndContact";
import Layout from "./Misc/Layout";
import Misc from "./Misc/Misc";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Features from "./pages/Features";
import Pricing from "./pages/Pricing";
import Resources from "./pages/Resources";
import Solutions from "./pages/Solutions";

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />

          <Route path="/about" element={<About />} />
          <Route path="/features" element={<Features />} />
          <Route path="/solutions" element={<Solutions />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/contact" element={<Contact />} />

          <Route path="/signin" element={<SignIn />} />
          <Route path="/register" element={<Register />} />
          <Route path="/help" element={<HelpAndContact />} />

          <Route element={<ProtectedRoute redirectTo="/signin" />}>
            <Route path="/settings" element={<Settings />} />
            <Route path="/creator" element={<CreatorHome />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/store" element={<Store />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/social" element={<Social />} />
            <Route path="/video" element={<Video />} />
            <Route path="/thesis" element={<Thesis />} />
            <Route path="/bio" element={<Bio />} />
            <Route path="/misc" element={<Misc />} />

            <Route path="/link" element={<LinkLayout />}>
              <Route index element={<LinkHome />} />
              <Route path="links" element={<Links />} />
              <Route path="create" element={<LinkCreate />} />
              <Route path="notes" element={<DisappearingNotes />} />
              <Route path="viewnote/:id" element={<ViewNote />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="verification" element={<BlockchainVerification />} />
            </Route>

            <Route path="/cv" element={<CVLayout />}>
              <Route index element={<CVPage />} />
              <Route path="builder" element={<CVBuilder />} />
              <Route path="portfolio" element={<CVPortfolio />} />
            </Route>
          </Route>

          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
