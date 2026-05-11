import { PageShell } from "@/components/layout";
import { MarketingCalendarReview } from "@/components/marketing/MarketingCalendarReview";
import { getMarketingCalendar } from "@/lib/ai/services/marketing-service";

export const metadata = {
  title: "Marketing Calendar | Alleato",
  description: "Review CMO-generated content calendar items and draft assets.",
};

function nextWeekRange() {
  const today = new Date();
  const day = today.getDay();
  const daysUntilMonday = ((8 - day) % 7) || 7;
  const start = new Date(today);
  start.setDate(today.getDate() + daysUntilMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default async function MarketingCalendarPage() {
  const range = nextWeekRange();
  const items = await getMarketingCalendar({ dateRange: range });

  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <PageShell
        variant="table"
        title="Marketing Calendar"
        description="Review source-backed CMO content plans, draft assets, citations, and approval states."
      >
        <MarketingCalendarReview items={items} />
      </PageShell>
    </div>
  );
}
