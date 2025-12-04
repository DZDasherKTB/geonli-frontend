import React, { useState, useRef } from 'react';

// Added displayMode prop to handle 'line_connect', 'box', etc.
const ImageCanvas = ({ imageUrl, groundingData, displayMode = 'box' }) => {
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const containerRef = useRef(null);

  // 1. Get natural image dimensions for accurate overlay mapping
  const onImgLoad = ({ target: img }) => {
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full flex items-center justify-center bg-black rounded-lg overflow-hidden shadow-2xl border border-gray-800"
    >
      <div className="relative inline-block">
        {/* Base Satellite Image */}
        <img 
          src={imageUrl} 
          alt="Satellite View" 
          onLoad={onImgLoad}
          className="max-w-full max-h-[80vh] object-contain block" 
        />

        {/* SVG Overlay */}
        {imgSize.w > 0 && groundingData && groundingData.length > 0 && (
          <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}
          >
            {/* --- LAYER 1: CONNECTION LINES (for Distance) --- */}
            {displayMode === 'line_connect' && groundingData.length >= 2 && (() => {
              const [obj1, obj2] = groundingData;
              // bbox is [cx, cy, w, h, theta]
              const [x1, y1] = obj1.bbox;
              const [x2, y2] = obj2.bbox;

              return (
                <g>
                  {/* Dashed Yellow Line */}
                  <line 
                    x1={x1} y1={y1} 
                    x2={x2} y2={y2} 
                    stroke="#FFFF00" 
                    strokeWidth="3" 
                    strokeDasharray="12, 8"
                    className="animate-pulse" // Optional: makes the line throb
                  />
                  {/* Distance Label Marker (Midpoint) */}
                  <circle cx={(x1+x2)/2} cy={(y1+y2)/2} r="5" fill="#FFFF00" />
                </g>
              );
            })()}

            {/* --- LAYER 2: ORIENTED BOUNDING BOXES --- */}
            {groundingData.map((obj, idx) => {
              // Backend sends: [x_center, y_center, width, height, theta_radians]
              const [cx, cy, w, h, theta] = obj.bbox;
              
              // Convert Radians to Degrees for SVG rotation
              const degrees = (theta * 180) / Math.PI;

              // Color Logic: Yellow for Distance mode, Green for standard detection
              const baseColor = displayMode === 'line_connect' ? '#FFFF00' : '#00ff00';
              const strokeColor = obj.score > 0.6 ? baseColor : '#ffcc00';

              return (
                <g key={idx} transform={`rotate(${degrees}, ${cx}, ${cy})`}>
                  {/* The Box */}
                  <rect
                    x={cx - w / 2}
                    y={cy - h / 2}
                    width={w}
                    height={h}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                    className="transition-all duration-300 ease-in-out"
                  />
                  
                  {/* Label Background */}
                  <rect
                    x={cx - w / 2}
                    y={cy - h / 2 - 22}
                    width={(obj.label.length * 10) + 24}
                    height="22"
                    fill={strokeColor}
                    opacity="0.9"
                  />
                  
                  {/* Label Text */}
                  <text
                    x={cx - w / 2 + 4}
                    y={cy - h / 2 - 6}
                    fill="black"
                    fontSize="14"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {obj.label}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
};

export default ImageCanvas;