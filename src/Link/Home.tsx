function Home() {

// // To Implement
// Total Links Created
// 👀 Total Clicks
// 📈 Clicks Today
// 🔗 Most clicked link
// 🚀 Quick actions:
// “Create New Link”
// “View Analytics”
// “Add Note”
// 📊 Small preview chart (last 7 days clicks)


  return (
    <main className="home-page-layout">

      <h1>Home</h1>
      <section className="quick-actions-card">
        <div className="create-quick-link-card">
          <h2>Quick Create Link</h2>
          <p>Enter a website url to create a shortened link</p>

          <form className="quick-create-form">
            <input
              type="text"
              placeholder="www.example.com"
              required
            />

            <button type="submit">
              Shorten Link
            </button>
          </form>
        </div>
      </section>

      <section className="recents-section">
        <div className="recents-card">
          <h2>Recent Links</h2>
        </div>
      </section>
      

    </main>
  )
}

export default Home
