import { StatsCard } from "@/components/Dashboard/StatsCard";
import { Mail, Send, TrendingUp, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const stats = [
    {
      title: "Total Sent Emails",
      value: "45,231",
      icon: Mail,
      trend: { value: "12% from last month", isPositive: true },
    },
    {
      title: "Active Campaigns",
      value: "12",
      icon: Send,
      trend: { value: "3 new this week", isPositive: true },
    },
    {
      title: "Delivery Rate",
      value: "98.5%",
      icon: TrendingUp,
      trend: { value: "0.5% improvement", isPositive: true },
    },
    {
      title: "Open Rate",
      value: "24.3%",
      icon: Eye,
      trend: { value: "2.1% from last month", isPositive: true },
    },
  ];

  const recentCampaigns = [
    { name: "Summer Sale 2024", sent: 5420, opened: 1350, clicked: 432, status: "Completed" },
    { name: "Product Launch", sent: 3200, opened: 890, clicked: 245, status: "In Progress" },
    { name: "Weekly Newsletter", sent: 8900, opened: 2134, clicked: 678, status: "Scheduled" },
  ];

  return (
    <div className="space-y-6 p-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your email campaign overview.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <div key={stat.title} style={{ animationDelay: `${index * 100}ms` }} className="animate-slide-in">
            <StatsCard {...stat} />
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Campaign Name</th>
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Sent</th>
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Opened</th>
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Clicked</th>
                  <th className="pb-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentCampaigns.map((campaign, index) => (
                  <tr key={index} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="py-4 font-medium">{campaign.name}</td>
                    <td className="py-4 text-muted-foreground">{campaign.sent.toLocaleString()}</td>
                    <td className="py-4 text-muted-foreground">{campaign.opened.toLocaleString()}</td>
                    <td className="py-4 text-muted-foreground">{campaign.clicked.toLocaleString()}</td>
                    <td className="py-4">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${
                        campaign.status === "Completed" ? "bg-green-100 text-green-800" :
                        campaign.status === "In Progress" ? "bg-blue-100 text-blue-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}>
                        {campaign.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
