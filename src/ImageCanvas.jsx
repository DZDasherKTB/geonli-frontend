import React, { useState, useEffect, useRef } from 'react';

const ImageCanvas = ({ imageUrl, groundingData }) => {
  const [imgSize, setImgSize] = useState({ w: 0, h: 0 });
  const containerRef = useRef(null);

  // 1. Get natural image dimensions for accurate overlay mapping
  const onImgLoad = ({ target: img }) => {
    setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
  };

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full flex items-center justify-center bg-transparent rounded-lg overflow-hidden"
    >
      <div className="relative inline-block">
        {/* Base Satellite Image */}
        <img 
          src={imageUrl} 
          alt="Satellite View" 
          onLoad={onImgLoad}
          className="max-w-full max-h-[70vh] object-contain block shadow-2xl rounded-sm" 
        />

        {/* SVG Overlay for Oriented Bounding Boxes */}
        {imgSize.w > 0 && groundingData && groundingData.length > 0 && (
          <svg
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            viewBox={`0 0 ${imgSize.w} ${imgSize.h}`}
          >
            {groundingData.map((obj, idx) => {
              // Backend sends: [x_center, y_center, width, height, theta]
              const [cx, cy, w, h, theta] = obj.bbox;
              
              // Convert Radians to Degrees for SVG rotation
              const degrees = (theta * 180) / Math.PI;

              // Color coding (Green for high confidence, Yellow for med)
              const strokeColor = obj.score > 0.6 ? '#00ff00' : '#ffcc00';

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
                    strokeWidth="4"
                    vectorEffect="non-scaling-stroke"
                  />
                  
                  {/* Label Background */}
                  <rect
                    x={cx - w / 2}
                    y={cy - h / 2 - 24}
                    width={obj.label.length * 12 + 20}
                    height="24"
                    fill={strokeColor}
                    opacity="0.9"
                  />
                  
                  {/* Label Text */}
                  <text
                    x={cx - w / 2 + 5}
                    y={cy - h / 2 - 7}
                    fill="black"
                    fontSize="16"
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