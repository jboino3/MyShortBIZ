// mockAnalytics.ts
export const analyticsData = {
  totalClicks: 12453,
  uniqueVisitors: 8421,
  activeLinks: 23,
  notesViewed: 312,

  clicksOverTime: [
    { date: "Mar 1", clicks: 120 },
    { date: "Mar 2", clicks: 200 },
    { date: "Mar 3", clicks: 150 },
  ],

  devices: [
    { name: "Desktop", value: 60 },
    { name: "Mobile", value: 30 },
    { name: "Tablet", value: 10 },
  ],

  referrers: [
    { source: "Direct", value: 50 },
    { source: "Twitter", value: 20 },
    { source: "Discord", value: 15 },
  ],

  links: [
    {
      id: 1,
      shortUrl: "mysh.rt/abc123",
      clicks: 523,
      lastAccessed: "2026-03-18",
      status: "Active",
    },
  ],
};