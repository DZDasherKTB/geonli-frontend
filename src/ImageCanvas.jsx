import React, { useState, useRef } from 'react';

const ImageCanvas = ({ imageUrl, groundingData, displayMode = 'box' }) => {
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const containerRef = useRef(null);

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
              const [x1, y1] = obj1.bbox;
              const [x2, y2] = obj2.bbox;

              return (
                <g>
                  {/* Red Dashed Line */}
                  <line 
                    x1={x1} y1={y1} 
                    x2={x2} y2={y2} 
                    stroke="#FF0000"  // <--- RED COLOR
                    strokeWidth="4" 
                    strokeDasharray="12, 8"
                    className="animate-pulse" 
                    style={{ filter: "drop-shadow(0px 0px 4px rgba(0,0,0,0.8))" }}
                  />
                  {/* Red Midpoint Marker */}
                  <circle cx={(x1+x2)/2} cy={(y1+y2)/2} r="6" fill="#FF0000" stroke="white" strokeWidth="2" />
                </g>
              );
            })()}

            {/* --- LAYER 2: ORIENTED BOUNDING BOXES --- */}
            {groundingData.map((obj, idx) => {
              const [cx, cy, w, h, theta] = obj.bbox;
              const degrees = (theta * 180) / Math.PI;

              // Color Logic: 
              // If measuring distance, target boxes are RED. 
              // Otherwise (standard detection), they are GREEN.
              const baseColor = displayMode === 'line_connect' ? '#FF0000' : '#00ff00';
              
              // Low confidence items can still be yellow/orange if needed
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
                    style={{ filter: "drop-shadow(0px 0px 2px rgba(0,0,0,0.5))" }}
                  />
                  
                  {/* Label Background */}
                  <rect
                    x={cx - w / 2}
                    y={cy - h / 2 - 24}
                    width={(obj.label.length * 11) + 24}
                    height="24"
                    fill={strokeColor}
                    opacity="0.9"
                  />
                  
                  {/* Label Text */}
                  <text
                    x={cx - w / 2 + 6}
                    y={cy - h / 2 - 7}
                    fill={displayMode === 'line_connect' ? 'white' : 'black'}
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