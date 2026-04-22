import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AccountCreationAndPayment/AuthContext";
import { API_BASE } from "../lib/apiBase";
import "./CreatorHome.scss";

type ToolLink = {
  label: string;
  to: string;
  description: string;
};

type SubscriptionOut = {
  id: number;
  plan_slug: string;
  plan_name: string;
  status: string;
};

const TOOL_LINKS: ToolLink[] = [
  { label: "CV", to: "/cv", description: "Show your background and key experience." },
  { label: "Link", to: "/link", description: "Manage your link hub and click flow." },
  { label: "Settings", to: "/settings", description: "Update account, profile, and preferences." },
  { label: "Shop", to: "/shop", description: "Launch offers and quick product drops." },
  { label: "Store", to: "/store", description: "Manage your full storefront catalog." },
  { label: "Studio", to: "/studio", description: "Organize your content production space." },
  { label: "Blog", to: "/blog", description: "Publish updates and creator stories." },
  { label: "Social", to: "/social", description: "Coordinate platform links and social touchpoints." },
  { label: "Video", to: "/video", description: "Host and showcase your video work." },
  { label: "Thesis", to: "/thesis", description: "Build and present the consent-first voice and phone agent demo." },
  { label: "Bio", to: "/bio", description: "Refine your creator bio and positioning." },
  { label: "Misc", to: "/misc", description: "Access additional creator utilities." },
];

function CreatorHome() {
  const { user, token, logout } = useAuth();
  const [currentPlan, setCurrentPlan] = useState("Starter");
  const displayName = user?.full_name || user?.email || "Creator";
  useEffect(() => {
    const loadPlan = async () => {
      if (!token) {
        setCurrentPlan("Starter");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/payments/my-subscriptions`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          setCurrentPlan("Starter");
          return;
        }

        const data = (await res.json()) as SubscriptionOut[];
        const active = data.find((sub) => sub.status === "active") || data[0];
        setCurrentPlan(active?.plan_name || "Starter");
      } catch {
        setCurrentPlan("Starter");
      }
    };

    loadPlan();
  }, [API_BASE, token]);

  return (
    <main className="home">
      <div className="site-page creator-home-page">
        <header className="page-header creator-home-header">
          <div className="creator-home-header__top">
            <p className="pill">Creator Home</p>
            <button type="button" className="creator-home-header__logout" onClick={logout}>
              Logout
            </button>
          </div>
          <h1>Welcome to your new creator suite, {displayName}.</h1>
          <p className="subtitle">
            Your current plan: <strong>{currentPlan}</strong>. Upgrade, manage billing, or switch plans
            in one place.
          </p>
          <Link className="plan-link" to="/payment">
            Manage plan and payment options
          </Link>
        </header>

        <section className="creator-tools-grid" aria-label="Creator tools">
          {TOOL_LINKS.map((tool) => (
            <Link key={tool.to} to={tool.to} className="creator-tool-card">
              <h2>{tool.label}</h2>
              <p>{tool.description}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}

export default CreatorHome;
