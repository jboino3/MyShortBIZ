// src/pages/About.tsx

import "./style.scss";

export default function Contact() {
  return (
    <main className="page">
      <section className="block Contact">
        <h2>Contact us</h2>
        <p>We'd love to hear from you! Whether you have a question about features,
          pricing, need a demo, or anything else, our team is ready to answer all your questions.
        </p>

        <div className="contact-info">
          <h3>
            Get in touch with us:
          </h3>
          <ul>
            <li><strong>Email:</strong> support@myshortbiz.com</li>
            <li><strong>Phone:</strong> (123) 123-4567</li>
            <li><strong>Business Hours:</strong> Monday-Friday, 9am-5pm (MST)</li>
          </ul>
          </div>
      </section>
    </main>
  );
}