import React, { FormEvent } from "react";
import "./styles.scss";

export default function Contact() {
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    alert("Thanks for reaching out! We'll get back to you shortly.");
  };

  return (
    <main className="page">
      <section className="block Contact">
        <header className="page-header">
          <span className="page-pill">Help &amp; Support</span>
          <h1>Contact us</h1>
          <p className="page-subtitle">
            Have a question about features, pricing, billing, or something else?
            Send us a message and our team will get back to you as soon as
            possible.
          </p>
        </header>

        <div className="contact-layout">
          {/* Left side – form */}
          <form className="contact-form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Your name*</label>
              <input
                id="name"
                name="name"
                type="text"
                placeholder="Your Name"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="email">Your email*</label>
              <input
                id="email"
                name="email"
                type="email"
                placeholder="johndoe@gmail.com"
                required
              />
            </div>

            <div className="field">
              <label htmlFor="company">Your brand or company if applicable</label>
              <input
                id="company"
                name="company"
                type="text"
                placeholder="MyShortBiz Studio"
              />
            </div>

            <div className="field">
              <label htmlFor="phone">Phone (optional)</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="XXX-XXX-XXXX"
              />
            </div>

            <div className="field">
              <label htmlFor="message">Your message*</label>
              <textarea
                id="message"
                name="message"
                placeholder="Tell us what you’d like help with…"
                required
              />
            </div>

            <button type="submit" className="primary-button">
              Send message
            </button>

            <p className="form-footnote">
              We usually reply within one business day.
            </p>
          </form>

          {/* Right side – direct contact info */}
          <aside className="contact-sidebar">
            <h2>Reach us directly</h2>
            <p>
              Prefer to talk to a human right away? Reach out using the details
              below and we’ll be happy to help.
            </p>

            <ul className="contact-list">
              <li>
                <span className="label">Email</span>
                <a href="mailto:support@myshortbiz.com">
                  support@myshortbiz.com
                </a>
              </li>
              <li>
                <span className="label">Phone</span>
                <a href="tel:+14809314967">(480) 931-4967</a>
              </li>
              <li>
                <span className="label">Business hours</span>
                <span>Monday–Friday, 9am–5pm (MST)</span>
              </li>
              <li>
                <span className="label">Response time</span>
                <span>Typically under 24 hours</span>
              </li>
            </ul>

            <div className="contact-highlight">
              <h3>Need a demo?</h3>
              <p>
                Tell us a bit about your workflow in the message and we’ll set
                up a tailored walkthrough of MyShortBiz.
              </p>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
