import React from 'react';
import { AlignmentGuide } from '../utils/alignmentGuides';

interface SmartGuidesOverlayProps {
  guides: AlignmentGuide[];
  zoom: number;
}

export const SmartGuidesOverlay: React.FC<SmartGuidesOverlayProps> = ({ guides }) => {
  if (!guides || guides.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-40 overflow-visible">
      {/* SVG Guideline Lines and Snap Markers */}
      <svg
        className="absolute top-0 left-0 overflow-visible pointer-events-none"
        style={{ width: 1, height: 1 }}
      >
        <defs>
          <filter id="guide-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="2" floodColor="#0284c7" floodOpacity="0.7" />
          </filter>
        </defs>

        {guides.map((guide) => {
          if (guide.orientation === 'vertical') {
            return (
              <g key={guide.id} className="animate-in fade-in duration-100">
                {/* Outer Glow Line */}
                <line
                  x1={guide.coordinate}
                  y1={guide.start}
                  x2={guide.coordinate}
                  y2={guide.end}
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeOpacity="0.4"
                  strokeLinecap="round"
                />
                {/* Main Precise Crisp Guideline (draw.io style) */}
                <line
                  x1={guide.coordinate}
                  y1={guide.start}
                  x2={guide.coordinate}
                  y2={guide.end}
                  stroke="#0284c7"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                />

                {/* Markers at Aligned Element Anchors */}
                {guide.markers.map((marker, mIdx) => (
                  <g key={`vm-${mIdx}`}>
                    {/* Outer Anchor Ring */}
                    <circle
                      cx={marker.x}
                      cy={marker.y}
                      r="4"
                      fill="#ffffff"
                      stroke="#0284c7"
                      strokeWidth="1.5"
                    />
                    {/* Inner Center Dot */}
                    <circle
                      cx={marker.x}
                      cy={marker.y}
                      r="1.5"
                      fill="#0284c7"
                    />
                  </g>
                ))}
              </g>
            );
          } else {
            return (
              <g key={guide.id} className="animate-in fade-in duration-100">
                {/* Outer Glow Line */}
                <line
                  x1={guide.start}
                  y1={guide.coordinate}
                  x2={guide.end}
                  y2={guide.coordinate}
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeOpacity="0.4"
                  strokeLinecap="round"
                />
                {/* Main Precise Crisp Guideline (draw.io style) */}
                <line
                  x1={guide.start}
                  y1={guide.coordinate}
                  x2={guide.end}
                  y2={guide.coordinate}
                  stroke="#0284c7"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  strokeLinecap="round"
                />

                {/* Markers at Aligned Element Anchors */}
                {guide.markers.map((marker, mIdx) => (
                  <g key={`hm-${mIdx}`}>
                    <circle
                      cx={marker.x}
                      cy={marker.y}
                      r="4"
                      fill="#ffffff"
                      stroke="#0284c7"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={marker.x}
                      cy={marker.y}
                      r="1.5"
                      fill="#0284c7"
                    />
                  </g>
                ))}
              </g>
            );
          }
        })}
      </svg>

      {/* Floating Alignment Badges */}
      {guides.map((guide) => {
        const isVertical = guide.orientation === 'vertical';
        const badgeX = isVertical ? guide.coordinate + 8 : (guide.start + guide.end) / 2;
        const badgeY = isVertical ? (guide.start + guide.end) / 2 : guide.coordinate - 18;

        return (
          <div
            key={`badge-${guide.id}`}
            style={{
              transform: `translate(${badgeX}px, ${badgeY}px)`,
            }}
            className="absolute pointer-events-none select-none px-1.5 py-0.5 rounded bg-sky-600/90 text-white font-mono text-[9px] font-bold shadow-md backdrop-blur-xs flex items-center gap-1 z-50 whitespace-nowrap transition-transform duration-75"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
            <span>{guide.label}</span>
          </div>
        );
      })}
    </div>
  );
};
