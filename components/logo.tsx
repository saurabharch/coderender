export function Logo({ size = 28, wordmark = "full" }: { size?: number; wordmark?: "full" | "desktop" }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label="coderender home">
      <svg width={size} height={size} viewBox="0 0 32 32" role="img" aria-hidden>
        <rect x="2" y="2" width="28" height="28" rx="8" className="fill-brand" />
        <path d="M10 11l-4 5 4 5" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 21l6-10" stroke="white" strokeWidth="3" fill="none" strokeLinecap="round" />
        <circle cx="23" cy="21" r="2.4" fill="white" />
      </svg>
      <span className={`text-lg font-extrabold tracking-tight ${wordmark === "desktop" ? "hidden lg:inline" : ""}`}>coderender</span>
    </span>
  );
}
