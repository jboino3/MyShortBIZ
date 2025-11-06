// src/Home/Home.tsx
import "./style.scss"; // keep this only if it contains page/hero styles (NOT the header)
// If this file currently has header styles, move those into components/Layout.scss and import there instead.

export default function Home() {
  return (
    <main className="page">
      <section className="hero">
        <h1>Power up your content with MyShort.biz tools</h1>
        <h3>
          Utilize our tools to enhance your content creation experience for
          yourself and for your fans.
        </h3>
      </section>
      {/* Home-specific content only */}
    </main>
  );
}
