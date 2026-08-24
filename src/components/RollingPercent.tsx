import { useEffect, useRef } from "react";

type RollingPercentProps = {
  value: number;
  className?: string;
};

export function RollingPercent({ value, className = "" }: RollingPercentProps) {
  const normalizedValue = Math.max(0, Math.min(100, Math.round(value)));
  const previousValueRef = useRef(normalizedValue);
  const previousValue = previousValueRef.current;
  const changed = previousValue !== normalizedValue;
  const direction = normalizedValue >= previousValue ? "up" : "down";

  useEffect(() => {
    previousValueRef.current = normalizedValue;
  }, [normalizedValue]);

  return (
    <span
      className={`rolling-percent rolling-percent-${direction}${className ? ` ${className}` : ""}`}
      aria-label={`${normalizedValue}%`}
    >
      <span className="rolling-percent-viewport" aria-hidden="true">
        {changed ? (
          <span key={`old-${previousValue}-${normalizedValue}`} className="rolling-percent-value rolling-percent-value-old">
            {previousValue}%
          </span>
        ) : null}
        <span key={`new-${normalizedValue}`} className={changed ? "rolling-percent-value rolling-percent-value-new" : "rolling-percent-value"}>
          {normalizedValue}%
        </span>
      </span>
    </span>
  );
}
