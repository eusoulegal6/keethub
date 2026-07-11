/**
 * Avatar Preview Component (SVG-based)
 * 
 * Displays a preview of the avatar using SVG rendering for accurate visual representation.
 * Follows the reference pattern with conditional rendering based on avatar configuration.
 * 
 * @module avatar/preview/AvatarPreviewSVG
 */

import { AvatarConfig } from "@/lib/avatar/config";
import { getAvatarSVGData } from "@/lib/avatar/preview/getAvatarSVGData";

interface AvatarPreviewSVGProps {
  config: AvatarConfig;
  size?: number;
  className?: string;
}

/**
 * SVG-based avatar preview component
 * 
 * Renders avatar using SVG shapes and paths for accurate representation.
 * Supports all customization options: skin tone, hair, clothing, accessories, and facial features.
 * 
 * @param config - Avatar configuration
 * @param size - Size of the preview in pixels (default: 200)
 * @param className - Additional CSS classes
 */
export function AvatarPreviewSVG({
  config,
  size = 200,
  className = "",
}: AvatarPreviewSVGProps) {
  const svgData = getAvatarSVGData(config);
  const viewBox = "0 0 200 200";
  const centerX = 100;
  const centerY = 100;

  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      className={`animate-scale-in ${className}`}
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      {/* Background Circle */}
      <circle cx={centerX} cy={centerY} r="95" fill="hsl(var(--muted))" />
      
      {/* Body/Clothing */}
      {svgData.outfitType === 'suit' ? (
        // Suit outfit
        <>
          <rect x="60" y="140" width="80" height="60" rx="8" fill={svgData.clothingColor} />
          <rect x="75" y="150" width="50" height="40" rx="4" fill="#1a1a1a" />
          <line x1="100" y1="150" x2="100" y2="190" stroke="#1a1a1a" strokeWidth="2" />
        </>
      ) : svgData.outfitType === 'costume' ? (
        // Costume outfit
        <>
          <rect x="60" y="140" width="80" height="60" rx="8" fill={svgData.clothingColor} />
          <circle cx="100" cy="160" r="15" fill="#FFD700" />
        </>
      ) : (
        // Regular clothing (top)
        <rect
          x="60"
          y="140"
          width="80"
          height="60"
          rx="8"
          fill={svgData.clothingColor}
        />
      )}
      
      {/* Neck */}
      <rect
        x="85"
        y="120"
        width="30"
        height="25"
        fill={svgData.skinTone}
      />
      
      {/* Head */}
      <circle cx={centerX} cy="85" r="40" fill={svgData.skinTone} />
      
      {/* Hair */}
      {svgData.hairStyle === 'short' && (
        <path
          d="M 60 75 Q 60 40, 100 40 Q 140 40, 140 75 L 135 80 Q 130 45, 100 45 Q 70 45, 65 80 Z"
          fill={svgData.hairColor}
        />
      )}
      {svgData.hairStyle === 'long' && (
        <>
          <path
            d="M 60 75 Q 60 40, 100 40 Q 140 40, 140 75 L 135 80 Q 130 45, 100 45 Q 70 45, 65 80 Z"
            fill={svgData.hairColor}
          />
          <ellipse cx="60" cy="100" rx="10" ry="25" fill={svgData.hairColor} />
          <ellipse cx="140" cy="100" rx="10" ry="25" fill={svgData.hairColor} />
        </>
      )}
      {svgData.hairStyle === 'curly' && (
        <>
          <circle cx="80" cy="60" r="15" fill={svgData.hairColor} />
          <circle cx="100" cy="50" r="18" fill={svgData.hairColor} />
          <circle cx="120" cy="60" r="15" fill={svgData.hairColor} />
          <circle cx="70" cy="75" r="12" fill={svgData.hairColor} />
          <circle cx="130" cy="75" r="12" fill={svgData.hairColor} />
        </>
      )}
      {svgData.hairStyle === 'wavy' && (
        <>
          <path
            d="M 60 75 Q 60 40, 100 40 Q 140 40, 140 75 L 135 80 Q 130 45, 100 45 Q 70 45, 65 80 Z"
            fill={svgData.hairColor}
          />
          <path
            d="M 65 85 Q 70 100, 75 95 Q 80 100, 85 95 Q 90 100, 95 95 Q 100 100, 105 95 Q 110 100, 115 95 Q 120 100, 125 95 Q 130 100, 135 95 L 140 100"
            stroke={svgData.hairColor}
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
        </>
      )}
      {svgData.hairStyle === 'bald' && (
        <circle cx={centerX} cy="85" r="40" fill={svgData.skinTone} stroke={svgData.skinTone} strokeWidth="2" />
      )}
      {svgData.hairStyle === 'bun' && (
        <>
          <path
            d="M 60 75 Q 60 40, 100 40 Q 140 40, 140 75 L 135 80 Q 130 45, 100 45 Q 70 45, 65 80 Z"
            fill={svgData.hairColor}
          />
          <circle cx="100" cy="50" r="12" fill={svgData.hairColor} />
        </>
      )}
      {svgData.hairStyle === 'ponytail' && (
        <>
          <path
            d="M 60 75 Q 60 40, 100 40 Q 140 40, 140 75 L 135 80 Q 130 45, 100 45 Q 70 45, 65 80 Z"
            fill={svgData.hairColor}
          />
          <ellipse cx="120" cy="60" rx="8" ry="20" fill={svgData.hairColor} />
        </>
      )}
      {(svgData.hairStyle === 'medium' || !['short', 'long', 'curly', 'wavy', 'bald', 'bun', 'ponytail'].includes(svgData.hairStyle)) && (
        <path
          d="M 60 75 Q 60 40, 100 40 Q 140 40, 140 75 L 135 80 Q 130 45, 100 45 Q 70 45, 65 80 Z"
          fill={svgData.hairColor}
        />
      )}
      
      {/* Eyes */}
      {svgData.eyeType === 'default' && (
        <>
          <circle cx="85" cy="85" r="5" fill="#2C3E50" />
          <circle cx="115" cy="85" r="5" fill="#2C3E50" />
          <circle cx="87" cy="83" r="2" fill="#FFFFFF" />
          <circle cx="117" cy="83" r="2" fill="#FFFFFF" />
        </>
      )}
      {svgData.eyeType === 'happy' && (
        <>
          <path d="M 78 85 Q 85 80, 92 85" stroke="#2C3E50" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M 108 85 Q 115 80, 122 85" stroke="#2C3E50" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}
      {svgData.eyeType === 'surprised' && (
        <>
          <circle cx="85" cy="85" r="7" fill="none" stroke="#2C3E50" strokeWidth="2" />
          <circle cx="115" cy="85" r="7" fill="none" stroke="#2C3E50" strokeWidth="2" />
          <circle cx="85" cy="85" r="4" fill="#2C3E50" />
          <circle cx="115" cy="85" r="4" fill="#2C3E50" />
        </>
      )}
      {svgData.eyeType === 'wink' && (
        <>
          <circle cx="85" cy="85" r="5" fill="#2C3E50" />
          <circle cx="87" cy="83" r="2" fill="#FFFFFF" />
          <path d="M 108 85 Q 115 80, 122 85" stroke="#2C3E50" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}
      {svgData.eyeType === 'sleepy' && (
        <>
          <path d="M 80 85 Q 85 88, 90 85" stroke="#2C3E50" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M 110 85 Q 115 88, 120 85" stroke="#2C3E50" strokeWidth="3" fill="none" strokeLinecap="round" />
        </>
      )}
      
      {/* Eyebrows */}
      {svgData.eyebrowType === 'default' && (
        <>
          <path d="M 75 72 Q 85 70, 95 72" stroke="#2C3E50" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 105 72 Q 115 70, 125 72" stroke="#2C3E50" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )}
      {svgData.eyebrowType === 'raised' && (
        <>
          <path d="M 75 68 Q 85 65, 95 68" stroke="#2C3E50" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 105 68 Q 115 65, 125 68" stroke="#2C3E50" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )}
      {svgData.eyebrowType === 'thick' && (
        <>
          <path d="M 75 72 Q 85 70, 95 72" stroke="#2C3E50" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M 105 72 Q 115 70, 125 72" stroke="#2C3E50" strokeWidth="4" fill="none" strokeLinecap="round" />
        </>
      )}
      {svgData.eyebrowType === 'thin' && (
        <>
          <path d="M 75 72 Q 85 70, 95 72" stroke="#2C3E50" strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M 105 72 Q 115 70, 125 72" stroke="#2C3E50" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </>
      )}
      {svgData.eyebrowType === 'arched' && (
        <>
          <path d="M 75 75 Q 85 68, 95 72" stroke="#2C3E50" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 105 72 Q 115 68, 125 75" stroke="#2C3E50" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </>
      )}
      
      {/* Mouth */}
      {svgData.mouthType === 'smile' && (
        <path d="M 80 105 Q 100 115, 120 105" stroke="#E74C3C" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      )}
      {svgData.mouthType === 'big-smile' && (
        <>
          <path d="M 80 105 Q 100 118, 120 105" stroke="#E74C3C" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <path d="M 85 108 Q 100 115, 115 108" fill="#FFFFFF" opacity="0.8" />
        </>
      )}
      {svgData.mouthType === 'neutral' && (
        <line x1="85" y1="105" x2="115" y2="105" stroke="#E74C3C" strokeWidth="2.5" strokeLinecap="round" />
      )}
      {svgData.mouthType === 'default' && (
        <line x1="85" y1="105" x2="115" y2="105" stroke="#E74C3C" strokeWidth="2.5" strokeLinecap="round" />
      )}
      
      {/* Facial Hair */}
      {svgData.facialHairType === 'beard' && (
        <>
          <path d="M 80 110 Q 100 125, 120 110" stroke="#2C3E50" strokeWidth="8" fill="none" strokeLinecap="round" />
          <ellipse cx="100" cy="115" rx="20" ry="12" fill={svgData.hairColor} />
        </>
      )}
      {svgData.facialHairType === 'mustache' && (
        <path d="M 85 108 Q 100 112, 115 108" stroke={svgData.hairColor} strokeWidth="4" fill="none" strokeLinecap="round" />
      )}
      {svgData.facialHairType === 'goatee' && (
        <>
          <path d="M 95 108 Q 100 115, 105 108" stroke={svgData.hairColor} strokeWidth="3" fill="none" strokeLinecap="round" />
          <ellipse cx="100" cy="115" rx="8" ry="10" fill={svgData.hairColor} />
        </>
      )}
      
      {/* Accessories - Glasses (rendered before hat so hat appears on top) */}
      {svgData.hasGlasses && (
        <>
          <circle cx="85" cy="85" r="12" fill="none" stroke="#2C3E50" strokeWidth="2" />
          <circle cx="115" cy="85" r="12" fill="none" stroke="#2C3E50" strokeWidth="2" />
          <line x1="97" y1="85" x2="103" y2="85" stroke="#2C3E50" strokeWidth="2" />
        </>
      )}
      
      {/* Accessories - Hat */}
      {svgData.hasHat && (
        <>
          <ellipse cx={centerX} cy="45" rx="45" ry="8" fill={svgData.clothingColor} />
          <rect x="75" y="38" width="50" height="15" rx="5" fill={svgData.clothingColor} />
        </>
      )}
    </svg>
  );
}

