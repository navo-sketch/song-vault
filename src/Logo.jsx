export default function MusicNoteKeyhole({ size = 64, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Modern LyricLab logo: flowing lyric waves */}
      {/* Wave 1 - bottom, represents lyrics flowing */}
      <path
        d="M 8 40 Q 14 28 22 40 T 38 40"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Wave 2 - middle */}
      <path
        d="M 6 24 Q 14 14 22 24 T 40 24"
        stroke={color}
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Wave 3 - top, inspiration spark */}
      <path
        d="M 12 10 Q 18 4 24 10 T 36 10"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Accent dot - the spark of creativity */}
      <circle cx="48" cy="16" r="3.5" fill={color} opacity="0.8" />
      {/* Small accent line */}
      <line x1="45" y1="22" x2="51" y2="28" stroke={color} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
