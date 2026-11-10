import { ForecastDesk } from "@/components/ForecastDesk";

// Seeded Helm Forecast market on Predict pm-AMM (devnet). See DEMO.md.
const SEEDED_FORECAST_IDS = ["HRjM8df1dFoi41XqqMZ8SibyQSs4gCDmHaQV6w47m1C4"];

export function generateStaticParams() {
  return SEEDED_FORECAST_IDS.map((id) => ({ id }));
}

export default function ForecastMarketPage({ params }: { params: { id: string } }) {
  return <ForecastDesk marketId={params.id} />;
}
