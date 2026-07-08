import { SectionRuleHeading } from "@/components/layout";

type StockProps = {
  price: number;
  symbol: string;
};

export const Stock = ({ price, symbol }: StockProps) => {
  return (
    <div>
      <SectionRuleHeading label="Stock Information" />
      <p>Symbol: {symbol}</p>
      <p>Price: ${price}</p>
    </div>
  );
};