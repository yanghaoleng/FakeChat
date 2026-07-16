import type { CSSProperties, ReactNode } from "react";

type SurfaceCardProps = {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
};

type ActionButtonProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  variant?: "primary" | "secondary";
};

function joinClassNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function SurfaceCard({ children, className, style }: SurfaceCardProps) {
  return <section className={joinClassNames("card", className)} style={style}>{children}</section>;
}

export function SurfaceCardHeader({ children, className }: Omit<SurfaceCardProps, "style">) {
  return <div className={joinClassNames("card__header", className)}>{children}</div>;
}

export function SurfaceCardContent({ children, className }: Omit<SurfaceCardProps, "style">) {
  return <div className={joinClassNames("card__content", className)}>{children}</div>;
}

export function ActionButton({
  children,
  className,
  disabled = false,
  fullWidth = false,
  onClick,
  variant = "secondary"
}: ActionButtonProps) {
  return (
    <button
      className={joinClassNames(
        "button",
        "button--md",
        `button--${variant}`,
        fullWidth && "button--full-width",
        className
      )}
      type="button"
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
