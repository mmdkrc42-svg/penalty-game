interface Props { size?: number; className?: string; }
export function CoinIcon({ size = 20, className = '' }: Props) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <circle cx="12" cy="12" r="10" fill="url(#coinGrad)" />
      <circle cx="12" cy="12" r="8" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
      <text x="12" y="16" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="Arial">B</text>
      <defs>
        <radialGradient id="coinGrad" cx="40%" cy="30%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </radialGradient>
      </defs>
    </svg>
  );
}
