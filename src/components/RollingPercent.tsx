import { Calligraph } from "calligraph";

type RollingPercentProps = {
  value: number;
  className?: string;
};

export function RollingPercent({ value, className = "" }: RollingPercentProps) {
  const normalizedValue = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <span className={`rolling-percent${className ? ` ${className}` : ""}`} aria-label={`${normalizedValue}%`}>
      <Calligraph
        className="rolling-percent-digits"
        variant="number"
        animation="smooth"
        stagger={0.018}
        autoSize={false}
        aria-hidden="true"
      >
        {normalizedValue}
      </Calligraph>
      <span className="rolling-percent-sign" aria-hidden="true">%</span>
    </span>
  );
}
