/**
 * Decorative SVG art for the hero's parallax layers. Server-safe (no hooks),
 * drawn in the design-system palette rather than sourced as raster cut-outs,
 * so the silhouettes stay crisp at any size and cost no image bytes.
 */

/** Midground — a monastery roofline on a ridge, anchored bottom-left. */
export function MonasteryRidge() {
  return (
    <svg
      viewBox="0 0 1440 360"
      preserveAspectRatio="xMidYMax slice"
      className="absolute bottom-0 h-[38%] w-full text-surface-inverse"
      aria-hidden
      focusable="false"
    >
      <g fill="currentColor">
        {/* Ridge */}
        <path
          d="M0 360 L0 300 Q140 250 300 268 Q420 280 520 252 L640 216 Q760 190 880 214 Q1030 242 1160 226 Q1310 206 1440 236 L1440 360 Z"
          opacity="0.88"
        />
        {/* Monastery: plinth, hall, pagoda roofs, finial */}
        <g transform="translate(996 96)" opacity="0.94">
          <rect x="-88" y="96" width="176" height="36" />
          <rect x="-68" y="58" width="136" height="44" />
          <path d="M-84 62 L0 40 L84 62 L68 50 L0 30 L-68 50 Z" />
          <rect x="-44" y="18" width="88" height="26" />
          <path d="M-58 22 L0 4 L58 22 L44 12 L0 -4 L-44 12 Z" />
          <rect x="-3" y="-22" width="6" height="20" />
          <circle cx="0" cy="-26" r="5" />
        </g>
        {/* Chorten to the left of the hall */}
        <g transform="translate(860 176)" opacity="0.9">
          <rect x="-18" y="26" width="36" height="12" />
          <rect x="-12" y="12" width="24" height="16" />
          <path d="M-10 12 Q0 -8 10 12 Z" />
          <rect x="-1.5" y="-16" width="3" height="10" />
        </g>
      </g>
    </svg>
  );
}

/** Foreground — two strings of lung-ta prayer flags across the top corners. */
export function PrayerFlagLines() {
  // Traditional five-colour order: blue, white, red, green, yellow — muted
  // to sit inside the palette instead of shouting over the photograph.
  const colours = ["#5a7d96", "#d9dfdb", "#b25549", "#4f7d68", "#d9a441"];
  const flag = (
    lineId: string,
    positions: { x: number; y: number; angle: number }[],
  ) =>
    positions.map((p, i) => (
      <g key={`${lineId}-${i}`} transform={`translate(${p.x} ${p.y}) rotate(${p.angle})`}>
        <rect width="34" height="26" fill={colours[i % colours.length]} opacity="0.82" />
      </g>
    ));

  return (
    <svg
      viewBox="0 0 1440 240"
      preserveAspectRatio="xMinYMin slice"
      className="absolute top-0 h-[26%] w-full"
      aria-hidden
      focusable="false"
    >
      {/* Left string, sagging toward centre */}
      <path
        d="M-20 30 Q 240 118 560 96"
        fill="none"
        stroke="#221c15"
        strokeWidth="1.5"
        opacity="0.55"
      />
      {flag("l", [
        { x: 40, y: 52, angle: 6 },
        { x: 120, y: 76, angle: -4 },
        { x: 205, y: 94, angle: 5 },
        { x: 295, y: 105, angle: -6 },
        { x: 390, y: 108, angle: 3 },
        { x: 480, y: 103, angle: -3 },
      ])}
      {/* Right string, shorter */}
      <path
        d="M1460 20 Q 1240 96 1000 74"
        fill="none"
        stroke="#221c15"
        strokeWidth="1.5"
        opacity="0.55"
      />
      {flag("r", [
        { x: 1370, y: 42, angle: -5 },
        { x: 1290, y: 62, angle: 4 },
        { x: 1205, y: 74, angle: -4 },
        { x: 1115, y: 78, angle: 6 },
        { x: 1030, y: 72, angle: -3 },
      ])}
    </svg>
  );
}
