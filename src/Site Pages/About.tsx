// src/pages/About.tsx
import "./style.scss";

export default function About() {
  return (
    <main className="page">
      <section className="block aboutus">
        <h2>About us</h2>

        <p>
          MyShortBiz is a modern creator-first platform built to help people launch
          pages, grow their audience, and sell digital products without complexity.
          Whether you're launching your first digital product or scaling your brand,
          we give you the tools to build quickly and professionally.
        </p>

        <h3>Our mission</h3>
        <p>
          Our mission is simple — empower creators and entrepreneurs by giving them
          everything they need to build, launch, and scale their online presence. 
          We believe in tools that are fast, intuitive, and designed for real people.
        </p>

        <h3>What we believe in</h3>
        <ul>
          <li><strong>Simplicity:</strong> Tools should be intuitive and easy to use.</li>
          <li><strong>Speed:</strong> Build and publish content in minutes, not hours.</li>
          <li><strong>Creativity:</strong> Everyone should have the freedom to create without limits.</li>
          <li><strong>Empowerment:</strong> We help creators succeed at every stage.</li>
        </ul>

        <h3>Our story</h3>
        <p>
          MyShortBiz was created to solve a problem — too many platforms make building
          your online business complicated. We set out to create a streamlined toolkit
          that helps creators turn ideas into action fast, without needing coding
          knowledge or expensive tools.
        </p>
      </section>
    </main>
  );
}