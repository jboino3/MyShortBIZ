import "./style.scss";
import { analyticsData } from "./mockAnalytics"; // your mock data

const Analytics = () => {
  return (
    <div className="analytics">
      <h1>Analytics</h1>

      {/* Stats Cards */}
      <div className="stats">
        <div className="card">Total Clicks: {analyticsData.totalClicks}</div>
        <div className="card">Visitors: {analyticsData.uniqueVisitors}</div>
        <div className="card">Active Links: {analyticsData.activeLinks}</div>
        <div className="card">Notes Viewed: {analyticsData.notesViewed}</div>
      </div>

      {/* Chart placeholders */}
      <div className="charts">
        <div className="chart-placeholder">
          <h3>Clicks Over Time</h3>
          <div className="placeholder-bar">[Chart Placeholder]</div>
        </div>

        <div className="chart-placeholder">
          <h3>Devices</h3>
          <div className="placeholder-bar">[Chart Placeholder]</div>
        </div>

        <div className="chart-placeholder">
          <h3>Referrers</h3>
          <div className="placeholder-bar">[Chart Placeholder]</div>
        </div>
      </div>

      {/* Links Table */}
      <div className="table-card">
        <h2>Top Links</h2>
        <div className="table-header">
          <span>Short URL</span>
          <span>Clicks</span>
          <span>Last Accessed</span>
          <span>Status</span>
        </div>
        {analyticsData.links.map((link) => (
          <div key={link.id} className="row">
            <span>{link.shortUrl}</span>
            <span>{link.clicks}</span>
            <span>{link.lastAccessed}</span>
            <span>{link.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Analytics;