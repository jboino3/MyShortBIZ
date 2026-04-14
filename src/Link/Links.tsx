import { Link } from "react-router-dom"

function Links() {
  

  return (
    <main className="link-page-layout">

      <h1>My Links</h1>
      <p>Manage, track, and create short links.</p>
      <Link to="/link/create">
        <button className="create-btn">
          Create Link
        </button>
      </Link>
      
      <section className="quick-actions-card">
        <div className="create-quick-link-card">
          <h2>*To add List of Links Created here</h2>
          <ul>
            <li>+ Filter, Search, Edit, Manage</li>
          </ul>

      
        </div>
      </section>
      
    </main>
  )
}

export default Links
