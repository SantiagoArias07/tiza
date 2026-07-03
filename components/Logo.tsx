/** Tiza brand mark: rounded slate square with a mustard checkmark. */
export function Logo({
  size = 36,
  variant = "box",
}: {
  size?: number;
  /** "box" = slate rounded square; "plain" = just the checkmark */
  variant?: "box" | "plain";
}) {
  if (variant === "plain") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#E7B84B"
        strokeWidth={2.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 13l4 4 10-12" />
      </svg>
    );
  }
  const radius = size * 0.3;
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: "#36495A",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flex: "none",
      }}
    >
      <svg
        width={size * 0.58}
        height={size * 0.58}
        viewBox="0 0 24 24"
        fill="none"
        stroke="#E7B84B"
        strokeWidth={2.7}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M5 13l4 4 10-12" />
      </svg>
    </span>
  );
}
