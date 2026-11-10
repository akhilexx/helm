import { MARKETS } from "@/lib/constants";
import { TradeDesk } from "@/components/TradeDesk";

export function generateStaticParams() {
  return MARKETS.map((m) => ({ symbol: m.symbol }));
}

export default function TradePage({ params }: { params: { symbol: string } }) {
  return <TradeDesk symbol={params.symbol} />;
}
