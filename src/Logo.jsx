export default function MusicNoteKeyhole({ size = 64, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Note head / keyhole outer circle */}
      <circle cx="22" cy="46" r="10" fill={color} />
      {/* Keyhole slot cut into note head */}
      <ellipse cx="22" cy="50" rx="4" ry="5.5" fill="#0F0F11" />
      <rect x="20" y="44" width="4" height="8" fill="#0F0F11" />
      {/* Note stem */}
      <rect x="31" y="10" width="3" height="38" rx="1.5" fill={color} />
      {/* Note beam / flag */}
      <path
        d="M34 10 C44 13 48 20 48 28 C44 25 38 23 34 24 Z"
        fill={color}
      />
    </svg>
  );
}
