/**
 * Avatar Preview Component
 * 
 * Displays a preview of the avatar based on the selected customization options.
 * Supports both DiceBear (client-side) and custom SVG rendering.
 * 
 * @module avatar/preview/AvatarPreview
 */

import { AvatarConfig } from "@/lib/avatar/config";
import { AvatarPreviewSVG } from "./AvatarPreviewSVG";
import { AvatarPreviewDiceBear } from "./AvatarPreviewDiceBear";

interface AvatarPreviewProps {
  config: AvatarConfig;
  size?: number;
  className?: string;
  /** Active category tab - for future use with category-aware rendering */
  activeCategory?: string;
  /** Renderer to use: 'dicebear' for DiceBear, 'custom' for custom SVG */
  renderer?: 'dicebear' | 'custom';
}

/**
 * Avatar preview component with dual renderer support
 * 
 * Displays avatar using either DiceBear (default) or custom SVG rendering.
 * DiceBear provides better visual quality and variety, while custom SVG
 * is available as a fallback.
 * 
 * The preview updates automatically when customization options change.
 * 
 * @param config - Avatar configuration
 * @param size - Size of the preview in pixels (default: 200)
 * @param className - Additional CSS classes
 * @param activeCategory - Active category tab (reserved for future enhancements)
 * @param renderer - Which renderer to use (default: 'dicebear')
 */
export function AvatarPreview({ 
  config, 
  size = 200, 
  className = "",
  activeCategory = 'skin',
  renderer = 'dicebear',
}: AvatarPreviewProps) {
  if (renderer === 'dicebear') {
    return (
      <AvatarPreviewDiceBear 
        config={config} 
        size={size} 
        className={className} 
      />
    );
  }
  
  return (
    <AvatarPreviewSVG 
      config={config} 
      size={size} 
      className={className}
    />
  );
}

