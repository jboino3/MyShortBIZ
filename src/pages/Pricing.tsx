import "./style.scss";
import { NavLink } from "react-router-dom";

export default function Pricing() {
  return (
    <div className="site-page">
      <header className="page-header">
        <p className="pill">Pricing</p>
        <h1>Simple plans that scale with you.</h1>
        <p className="subtitle">
          Start free, then upgrade only when you’re ready for more analytics,
          customization, and revenue tools.
        </p>
      </header>

      <section className="pricing-grid">
        <article className="pricing-card">
          <p className="plan-label">Starter</p>
          <h2>$10<span>/mo</span></h2>
          <p className="plan-sub">
            For trying MyShortBiz and early-stage pages.
          </p>
          <ul>
            <li>1 live page</li>
            <li>Basic link & click analytics</li>
            <li>Core layout + theme options</li>
            <li>Unlimited link clicks</li>
          </ul>
          <NavLink to="/register" className="plan-cta">
            Start free trial
          </NavLink>
        </article>

        <article className="pricing-card pricing-card--highlighted">
          <p className="plan-label">Creator</p>
          <h2>
            $30<span>/mo</span>
          </h2>
          <p className="plan-sub">
            Best for active creators and solopreneurs.
          </p>
          <ul>
            <li>Up to 5 live pages</li>
            <li>Advanced analytics & UTM insights</li>
            <li>Product blocks + featured offers</li>
            <li>Email capture & basic integrations</li>
            <li>Priority support</li>
          </ul>
          <NavLink to="/register" className="plan-cta plan-cta--primary">
            Start Creator plan
          </NavLink>
        </article>

        <article className="pricing-card">
          <p className="plan-label">Studio</p>
          <h2>Custom</h2>
          <p className="plan-sub">
            For teams, agencies, and multi-brand setups.
          </p>
          <ul>
            <li>Unlimited pages & workspaces</li>
            <li>Team permissions & shared templates</li>
            <li>Custom domains & white-label options</li>
            <li>Dedicated onboarding</li>
          </ul>
          <NavLink to="/contact" className="plan-cta">
            Talk to us
          </NavLink>
        </article>
      </section>

      <section className="pricing-faq">
        <h2>Frequently asked</h2>
        <div className="faq-grid">
          <div>
            <h3>Can I switch plans later?</h3>
            <p>
              Yes — upgrade or downgrade at any time. Changes apply on your next
              billing cycle.
            </p>
          </div>
          <div>
            <h3>Do you charge transaction fees?</h3>
            <p>
              Payments are processed via your connected provider. We don’t add
              extra fees on top of standard processing costs.
            </p>
          </div>
          <div>
            <h3>Is there a free trial?</h3>
            <p>
              The Starter plan is free for 7 days, so you can build your page and upgrade
              only when you’re ready.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
