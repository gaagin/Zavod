import React from 'react';
import { AlignmentGuide } from '../utils/alignmentGuides';

interface AlignmentGuidesOverlayProps {
  guides: AlignmentGuide[];
  zoom: number;
}

export const AlignmentGuidesOverlay: React.FC<AlignmentGuidesOverlayProps> = ({ guides, zoom }) => {
  if (!guides || guides.length === 0) return null;

  const strokeW = Math.max(1, 1.5 / Math.max(0.2, zoom));
  const glowW = strokeW * 2.5;
  const markerR = Math.max(2.5, 3.5 / Math.max(0.2, zoom));
  const tickLen = Math.max(5, 7 / Math.max(0.2, zoom));
  const fontSize = Math.max(9, Math.min(12, 11 / Math.max(0.2, zoom)));

  return (
    <g className="alignment-guides-overlay pointer-events-none select-none z-40">
      {guides.map(guide => {
        const isVert = guide.type === 'vertical';

        return (
          <g key={guide.id} className="guide-group animate-in fade-in duration-75">
            {/* 1. Soft Glow Line */}
            {isVert ? (
              <line
                x1={guide.coord}
                y1={guide.start}
                x2={guide.coord}
                y2={guide.end}
                stroke="rgba(56, 189, 248, 0.45)"
                strokeWidth={glowW}
                strokeLinecap="round"
              />
            ) : (
              <line
                x1={guide.start}
                y1={guide.coord}
                x2={guide.end}
                y2={guide.coord}
                stroke="rgba(56, 189, 248, 0.45)"
                strokeWidth={glowW}
                strokeLinecap="round"
              />
            )}

            {/* 2. Main Crisp Dashed Line (draw.io style cyan/blue) */}
            {isVert ? (
              <line
                x1={guide.coord}
                y1={guide.start}
                x2={guide.coord}
                y2={guide.end}
                stroke="#0284c7"
                strokeWidth={strokeW}
                strokeDasharray={`${4 / Math.max(0.2, zoom)} ${3 / Math.max(0.2, zoom)}`}
                strokeLinecap="round"
              />
            ) : (
              <line
                x1={guide.start}
                y1={guide.coord}
                x2={guide.end}
                y2={guide.coord}
                stroke="#0284c7"
                strokeWidth={strokeW}
                strokeDasharray={`${4 / Math.max(0.2, zoom)} ${3 / Math.max(0.2, zoom)}`}
                strokeLinecap="round"
              />
            )}

            {/* 3. Ticks at the Ends */}
            {isVert ? (
              <>
                <line
                  x1={guide.coord - tickLen}
                  y1={guide.start}
                  x2={guide.coord + tickLen}
                  y2={guide.start}
                  stroke="#0284c7"
                  strokeWidth={strokeW}
                />
                <line
                  x1={guide.coord - tickLen}
                  y1={guide.end}
                  x2={guide.coord + tickLen}
                  y2={guide.end}
                  stroke="#0284c7"
                  strokeWidth={strokeW}
                />
              </>
            ) : (
              <>
                <line
                  x1={guide.start}
                  y1={guide.coord - tickLen}
                  x2={guide.start}
                  y2={guide.coord + tickLen}
                  stroke="#0284c7"
                  strokeWidth={strokeW}
                />
                <line
                  x1={guide.end}
                  y1={guide.coord - tickLen}
                  x2={guide.end}
                  y2={guide.coord + tickLen}
                  stroke="#0284c7"
                  strokeWidth={strokeW}
                />
              </>
            )}

            {/* 4. Crosshair / Diamond Anchor Markers at each aligned object */}
            {guide.anchorPoints.map((pt, idx) => (
              <g key={`marker-${guide.id}-${idx}-${pt.x}-${pt.y}`}>
                {/* Crosshair lines */}
                <line
                  x1={pt.x - tickLen}
                  y1={pt.y}
                  x2={pt.x + tickLen}
                  y2={pt.y}
                  stroke="#0284c7"
                  strokeWidth={strokeW * 1.2}
                />
                <line
                  x1={pt.x}
                  y1={pt.y - tickLen}
                  x2={pt.x}
                  y2={pt.y + tickLen}
                  stroke="#0284c7"
                  strokeWidth={strokeW * 1.2}
                />
                {/* Outer ring */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={markerR}
                  fill="#ffffff"
                  stroke="#0284c7"
                  strokeWidth={strokeW}
                />
                {/* Center dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={markerR * 0.4}
                  fill="#0284c7"
                />
              </g>
            ))}

            {/* 5. Minimalistic Draw.io Alignment Label Badge */}
            {(() => {
              const midX = isVert ? guide.coord : (guide.start + guide.end) / 2;
              const midY = isVert ? (guide.start + guide.end) / 2 : guide.coord;
              const badgeOffsetX = isVert ? 8 / Math.max(0.2, zoom) : 0;
              const badgeOffsetY = isVert ? 0 : -10 / Math.max(0.2, zoom);

              return (
                <g transform={`translate(${midX + badgeOffsetX}, ${midY + badgeOffsetY})`}>
                  <rect
                    x={-4 / Math.max(0.2, zoom)}
                    y={-fontSize - 2 / Math.max(0.2, zoom)}
                    width={guide.label.length * fontSize * 0.62 + 8 / Math.max(0.2, zoom)}
                    height={fontSize + 6 / Math.max(0.2, zoom)}
                    rx={3 / Math.max(0.2, zoom)}
                    fill="rgba(15, 23, 42, 0.85)"
                    stroke="#38bdf8"
                    strokeWidth={strokeW * 0.8}
                  />
                  <text
                    x={0}
                    y={-2 / Math.max(0.2, zoom)}
                    fill="#38bdf8"
                    fontSize={fontSize}
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="start"
                  >
                    {guide.label}
                  </text>
                </g>
              );
            })()}
          </g>
        );
      })}
    </g>
  );
};
