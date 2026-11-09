import { ForecastDesk } from "@/components/ForecastDesk";

export default function ForecastMarketPage({ params }: { params: { id: string } }) {
  return <ForecastDesk marketId={params.id} />;
}
