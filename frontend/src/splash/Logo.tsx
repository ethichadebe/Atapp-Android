// The Atapp logo: a T standing in a green three-toothed base, drawn on a
// 56-unit grid from the updated artwork. The T and the bars in the notches
// take the text colour (white on the dark splash, black on the light one);
// the green stays green.

const GREEN = "#61bc21";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 56 56" aria-hidden="true">
      <g fill="currentColor">
        <rect x="0" y="0" width="56" height="14" />
        <rect x="21.5" y="15" width="13" height="8" />
        <rect x="12.5" y="33" width="9" height="8" />
        <rect x="34.5" y="33" width="9" height="8" />
      </g>
      <path fill={GREEN} d="M0 21h12.5v20h9V23h13v18h9V21H56v35H0z" />
    </svg>
  );
}
