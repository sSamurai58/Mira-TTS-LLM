import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
};

export function Button({ variant = "primary", children, style, ...rest }: BtnProps) {
  const base: React.CSSProperties = {
    height: 36,
    padding: "0 16px",
    borderRadius: 6,
    border: "1px solid transparent",
    cursor: rest.disabled ? "not-allowed" : "pointer",
    opacity: rest.disabled ? 0.5 : 1,
    fontWeight: 500,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: "var(--action)", color: "var(--white)", borderColor: "var(--action)" },
    secondary: {
      background: "transparent",
      color: "var(--ink)",
      borderColor: "var(--line)",
    },
    danger: { background: "var(--danger)", color: "var(--white)", borderColor: "var(--danger)" },
  };
  return (
    <button
      type="button"
      {...rest}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseEnter={(e) => {
        if (variant === "primary" && !rest.disabled) {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--action-hover)";
        }
        rest.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (variant === "primary" && !rest.disabled) {
          (e.currentTarget as HTMLButtonElement).style.background = "var(--action)";
        }
        rest.onMouseLeave?.(e);
      }}
    >
      {children}
    </button>
  );
}

export function TextField(props: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  const { label, id, ...rest } = props;
  const fieldId = id || label;
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 8 }} htmlFor={fieldId}>
      <span className="meta">{label}</span>
      <input
        id={fieldId}
        {...rest}
        style={{
          height: 36,
          padding: "0 12px",
          border: "1px solid var(--line)",
          borderRadius: 6,
          background: "var(--surface)",
          ...((rest.style as object) || {}),
        }}
      />
    </label>
  );
}

export function StatusPill({
  tone,
  children,
}: {
  tone: "mute" | "action" | "success" | "danger";
  children: ReactNode;
}) {
  const color = {
    mute: "var(--mute)",
    action: "var(--action)",
    success: "var(--success)",
    danger: "var(--danger)",
  }[tone];
  return (
    <span
      className="meta"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 8px",
        borderRadius: 4,
        border: "1px solid var(--line)",
        background: "var(--surface)",
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: 4, background: color }} aria-hidden />
      {children}
    </span>
  );
}

export function ListRow({
  children,
  selected,
  onClick,
}: {
  children: ReactNode;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        height: 48,
        padding: "0 16px",
        border: "none",
        borderBottom: "1px solid var(--line)",
        background: selected ? "color-mix(in srgb, var(--panel) 55%, var(--surface))" : "var(--surface)",
        textAlign: "left",
        cursor: onClick ? "pointer" : "default",
      }}
    >
      {children}
    </button>
  );
}
