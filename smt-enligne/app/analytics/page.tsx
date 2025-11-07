import { Navigation } from "@/components/navigation"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"

export default function AnalyticsPage() {
  return (
    <div className="min-h-screen flex bg-background">
  <Navigation />
  <main className="flex-1 pt-14 lg:pt-0 pl-0 lg:pl-[calc(16rem+0.75rem)] p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          <AnalyticsDashboard />
        </div>
      </main>
    </div>
  )
}
