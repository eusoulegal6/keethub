/**
 * Avatar Configuration System
 * 
 * This module provides the core data structures and utilities for the avatar customization system.
 * It defines TypeScript interfaces, default configurations, and storage/transmission utilities.
 * 
 * @module avatarConfig
 */

/**
 * Hair customization options for an avatar
 * 
 * @interface AvatarHair
 * @property {string} style - Hair style identifier (e.g., 'short', 'long', 'curly')
 * @property {string} color - Hair color as hex string (e.g., '#000000') or preset ID
 */
export interface AvatarHair {
  style: string;
  color: string;
}

/**
 * Clothing customization options for an avatar
 * 
 * @interface AvatarClothes
 * @property {string | null} top - Top/clothing item ID (null if using outfit)
 * @property {string | null} bottom - Bottom item ID (null if using outfit)
 * @property {string | null} outfit - Full outfit ID (overrides top/bottom when set)
 * @property {string} color - Primary clothing color as hex string (e.g., '#3B82F6')
 */
export interface AvatarClothes {
  top: string | null;
  bottom: string | null;
  outfit: string | null; // Full outfit (overrides top/bottom)
  color: string; // Primary clothing color
}

/**
 * Accessories customization options for an avatar
 * 
 * @interface AvatarAccessories
 * @property {string | null} hat - Hat/headwear ID (null if none)
 * @property {string | null} glasses - Glasses/eyewear ID (null if none)
 * @property {string[]} jewelry - Array of jewelry item IDs
 * @property {string[]} other - Array of other accessory IDs
 */
export interface AvatarAccessories {
  hat: string | null;
  glasses: string | null;
  jewelry: string[];
  other: string[];
}

/**
 * Facial feature customization options for an avatar
 * 
 * @interface AvatarFace
 * @property {string} eyes - Eye style identifier (e.g., 'default', 'happy', 'wink')
 * @property {string} eyebrows - Eyebrow style identifier (e.g., 'default', 'thick', 'thin')
 * @property {string} mouth - Mouth style identifier (e.g., 'default', 'smile', 'big-smile')
 * @property {string | null} facialHair - Facial hair ID (null if none)
 */
export interface AvatarFace {
  eyes: string;
  eyebrows: string;
  mouth: string;
  facialHair: string | null;
}

/**
 * Body customization options for an avatar
 * 
 * @interface AvatarBody
 * @property {string} shape - Body shape identifier (e.g., 'slim', 'average', 'athletic')
 * @property {'small' | 'medium' | 'large'} size - Body size option
 */
export interface AvatarBody {
  shape: string;
  size: 'small' | 'medium' | 'large';
}

/**
 * DiceBear-only customization options
 * 
 * These options are only available when using DiceBear renderer.
 * 
 * @interface DiceBearOptions
 * @property {string | null} clothingGraphic - Graphic to apply to graphic shirts (e.g., 'bat', 'pizza')
 * @property {'default' | 'circle'} backgroundStyle - Background shape style
 * @property {string | null} backgroundColor - Background color as hex or preset ID
 */
export interface DiceBearOptions {
  clothingGraphic: string | null;
  backgroundStyle: 'default' | 'circle';
  backgroundColor: string | null;
}

/**
 * Complete avatar configuration
 * 
 * Contains all customization options for a player's avatar.
 * This is the main data structure used throughout the avatar system.
 * 
 * @interface AvatarConfig
 * @property {string} id - Unique identifier generated from config content
 * @property {string} name - User-defined avatar name (max 30 characters)
 * @property {string} skinTone - Skin tone as hex color (e.g., '#FFDBAC') or preset ID
 * @property {AvatarHair} hair - Hair customization options
 * @property {AvatarClothes} clothes - Clothing customization options
 * @property {AvatarAccessories} accessories - Accessories customization options
 * @property {AvatarFace} face - Facial features customization options
 * @property {AvatarBody} body - Body shape and size customization options
 * @property {DiceBearOptions} [dicebear] - DiceBear-only options (optional, only used with DiceBear renderer)
 * @property {string} [customDrawings] - JSON string of Fabric.js canvas drawings (optional, for drawable avatar feature)
 */
export interface AvatarConfig {
  id: string;
  name: string;
  skinTone: string; // Hex color or preset ID
  hair: AvatarHair;
  clothes: AvatarClothes;
  accessories: AvatarAccessories;
  face: AvatarFace;
  body: AvatarBody;
  dicebear?: DiceBearOptions; // Optional DiceBear-only features
  customDrawings?: string; // Optional: JSON string of Fabric.js canvas drawings
  customImageUrl?: string; // Optional: Data URL or URL of uploaded custom image (replaces DiceBear avatar)
}

/**
 * Default avatar configuration used as fallback and initial state
 * 
 * All new avatars start with these values. Individual properties can be
 * customized by the user through the avatar customization interface.
 * 
 * @constant {AvatarConfig} DEFAULT_AVATAR_CONFIG
 */
export const DEFAULT_AVATAR_CONFIG: AvatarConfig = {
  id: 'default',
  name: 'My Avatar',
  skinTone: '#FFDBAC',
  hair: {
    style: 'short',
    color: '#000000',
  },
  clothes: {
    top: 'tshirt',
    bottom: 'jeans',
    outfit: null,
    color: '#3B82F6',
  },
  accessories: {
    hat: null,
    glasses: null,
    jewelry: [],
    other: [],
  },
  face: {
    eyes: 'default',
    eyebrows: 'default',
    mouth: 'smile',
    facialHair: null,
  },
  body: {
    shape: 'average',
    size: 'medium',
  },
  dicebear: {
    clothingGraphic: null,
    backgroundStyle: 'default',
    backgroundColor: null,
  },
};

/**
 * Base localStorage key for storing avatar configuration
 * @constant {string} AVATAR_STORAGE_KEY_BASE
 */
const AVATAR_STORAGE_KEY_BASE = 'paint-and-guess-avatar-config';

/**
 * Get user-specific storage key for avatar configuration
 * @param {string | null | undefined} userId - Optional user ID to make key user-specific
 * @returns {string} Storage key (user-specific if userId provided, otherwise global for anonymous users)
 */
function getAvatarStorageKey(userId?: string | null): string {
  if (userId) {
    return `${AVATAR_STORAGE_KEY_BASE}-user-${userId}`;
  }
  return `${AVATAR_STORAGE_KEY_BASE}-anonymous`;
}

/**
 * Storage event type for cross-tab synchronization
 * @constant {string} AVATAR_STORAGE_EVENT
 */
const AVATAR_STORAGE_EVENT = 'avatar-config-storage-changed';

/**
 * Internal flag to prevent infinite loops during cross-tab sync
 */
let isInternalUpdate = false;

/**
 * Current version of the avatar config storage format
 * Increment this when making breaking changes to the config structure
 * @constant {number} AVATAR_STORAGE_VERSION
 */
const AVATAR_STORAGE_VERSION = 1;

/**
 * Internal structure for stored avatar data with versioning
 * 
 * @interface StoredAvatar
 * @property {number} version - Storage format version for migration support
 * @property {AvatarConfig} config - The actual avatar configuration
 * @property {number} timestamp - Unix timestamp when config was saved
 */
interface StoredAvatar {
  version: number;
  config: AvatarConfig;
  timestamp: number;
}

/**
 * Migrate avatar config from older versions to current version
 * 
 * This function handles schema changes between versions. When the storage
 * format changes, add migration logic here to convert old configs.
 * 
 * @param {any} config - The config from the old version (may be partial or different structure)
 * @param {number} fromVersion - The version number of the old config
 * @returns {AvatarConfig} Migrated config compatible with current version
 * 
 * @example
 * // When adding a new required field in version 2:
 * if (fromVersion < 2) {
 *   return { ...config, newField: defaultValue };
 * }
 */
function migrateAvatarConfig(config: any, fromVersion: number): AvatarConfig {
  // Handle version migrations here
  if (fromVersion < 1) {
    // Version 0: Legacy format (no versioning) - try to preserve what we can
    console.debug('[avatarConfig] Migrating from version 0 (legacy)');
    
    // If it looks like a valid config structure, try to use it
    if (config && typeof config === 'object' && config.name) {
      try {
        // Attempt to create a valid config from legacy data
        const migrated: AvatarConfig = {
          id: config.id || generateAvatarId(config),
          name: config.name || DEFAULT_AVATAR_CONFIG.name,
          skinTone: config.skinTone || DEFAULT_AVATAR_CONFIG.skinTone,
          hair: config.hair || DEFAULT_AVATAR_CONFIG.hair,
          clothes: config.clothes || DEFAULT_AVATAR_CONFIG.clothes,
          accessories: config.accessories || DEFAULT_AVATAR_CONFIG.accessories,
          face: config.face || DEFAULT_AVATAR_CONFIG.face,
          body: config.body || DEFAULT_AVATAR_CONFIG.body,
        };
        return migrated;
      } catch (error) {
        console.warn('[avatarConfig] Failed to migrate legacy config, using defaults', error);
        return createDefaultAvatarConfig();
      }
    }
    
    // If legacy format is unrecognizable, return default
    return createDefaultAvatarConfig();
  }
  
  // Version 1: Current version, no migration needed
  if (fromVersion === 1) {
    return config as AvatarConfig;
  }
  
  // Future versions: Add migration logic here
  // Example for version 2:
  // if (fromVersion < 2) {
  //   return { ...config, newField: defaultValue };
  // }
  
  console.warn(`[avatarConfig] Unknown version ${fromVersion}, attempting to use as-is`);
  return config as AvatarConfig;
}

/**
 * Load avatar configuration from localStorage with versioning support
 * 
 * Automatically handles:
 * - Version migration for older config formats
 * - Corrupted data cleanup
 * - Legacy format conversion
 * 
 * @returns {AvatarConfig | null} The loaded avatar config, or null if none exists or loading fails
 * 
 * @example
 * const config = loadAvatarConfig();
 * if (config) {
 *   console.log('Loaded avatar:', config.name);
 * } else {
 *   console.log('No saved avatar found');
 * }
 */
/**
 * Load avatar configuration from localStorage with versioning support
 * 
 * Automatically handles:
 * - Version migration for older config formats
 * - Corrupted data cleanup
 * - Legacy format conversion
 * - Migration from old sessionStorage/tab-based storage
 * - User-specific storage keys
 * 
 * @param {string | null | undefined} userId - Optional user ID to load user-specific avatar
 * @returns {AvatarConfig | null} The loaded avatar config, or null if none exists or loading fails
 * 
 * @example
 * const config = loadAvatarConfig(userId);
 * if (config) {
 *   console.log('Loaded avatar:', config.name);
 * } else {
 *   console.log('No saved avatar found');
 * }
 */
export function loadAvatarConfig(userId?: string | null): AvatarConfig | null {
  if (typeof window === 'undefined') return null;
  
  try {
    // Try user-specific key first if userId is provided
    if (userId) {
      const userKey = getAvatarStorageKey(userId);
      const userStored = localStorage.getItem(userKey);
      if (userStored) {
        try {
          const data = JSON.parse(userStored);
          if (data.version !== undefined) {
            const storedData = data as StoredAvatar;
            if (storedData.version !== AVATAR_STORAGE_VERSION) {
              console.log(`Migrating avatar config from version ${storedData.version} to ${AVATAR_STORAGE_VERSION}`);
              const migrated = migrateAvatarConfig(storedData.config, storedData.version);
              saveAvatarConfig(migrated, false, userId);
              return migrated;
            }
            return storedData.config;
          }
          const migrated = migrateAvatarConfig(data, 0);
          saveAvatarConfig(migrated, false, userId);
          return migrated;
        } catch (error) {
          console.error('Failed to parse user avatar config:', error);
          localStorage.removeItem(userKey);
        }
      }
    }

    // Try anonymous/global key for backward compatibility
    const anonymousKey = getAvatarStorageKey(null);
    const stored = localStorage.getItem(anonymousKey);
    if (stored) {
      const data = JSON.parse(stored);
      
      // Check if it's the new versioned format
      if (data.version !== undefined) {
        const storedData = data as StoredAvatar;
        
        // Handle version migration
        if (storedData.version !== AVATAR_STORAGE_VERSION) {
          console.log(`Migrating avatar config from version ${storedData.version} to ${AVATAR_STORAGE_VERSION}`);
          const migrated = migrateAvatarConfig(storedData.config, storedData.version);
          // Save migrated version
          saveAvatarConfig(migrated, false);
          return migrated;
        }
        
        return storedData.config;
      }
      
      // Legacy format (no version) - migrate it
      console.log('Migrating legacy avatar config');
      const migrated = migrateAvatarConfig(data, 0);
      saveAvatarConfig(migrated, false);
      return migrated;
    }

    // Try to migrate from old sessionStorage format (tab-based)
    // Check for any sessionStorage keys that match the old pattern
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith('paint-and-guess-avatar-config-')) {
        try {
          const oldStored = sessionStorage.getItem(key);
          if (oldStored) {
            const oldData = JSON.parse(oldStored);
            console.log('Migrating avatar from old sessionStorage format');
            
            if (oldData.version !== undefined && oldData.config) {
              const migrated = migrateAvatarConfig(oldData.config, oldData.version || 0);
              saveAvatarConfig(migrated, false);
              // Clean up old sessionStorage entry
              sessionStorage.removeItem(key);
              return migrated;
            } else if (oldData.name) {
              // Legacy format without version
              const migrated = migrateAvatarConfig(oldData, 0);
              saveAvatarConfig(migrated, false);
              sessionStorage.removeItem(key);
              return migrated;
            }
          }
        } catch (error) {
          // Skip corrupted entries
          console.warn('Failed to migrate old avatar from sessionStorage:', key, error);
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to load avatar config:', error);
    // Clear corrupted data
    try {
      if (userId) {
        localStorage.removeItem(getAvatarStorageKey(userId));
      }
      localStorage.removeItem(getAvatarStorageKey(null));
    } catch {
      // Ignore errors during cleanup
    }
  }
  
  return null;
}

/**
 * Save avatar configuration to localStorage with versioning and cross-tab sync
 * 
 * Stores the config with version information for future migration support.
 * Handles quota exceeded errors gracefully.
 * Triggers cross-tab synchronization via custom storage event.
 * Uses user-specific storage keys when userId is provided.
 * 
 * @param {AvatarConfig} config - The avatar configuration to save
 * @param {boolean} syncToOtherTabs - Whether to trigger cross-tab sync (default: true)
 * @param {string | null | undefined} userId - Optional user ID to save to user-specific storage
 * @throws {Error} Logs error if save fails (doesn't throw to prevent app crash)
 * 
 * @example
 * const myConfig = createDefaultAvatarConfig('My Avatar');
 * saveAvatarConfig(myConfig, true, userId);
 */
export function saveAvatarConfig(config: AvatarConfig, syncToOtherTabs: boolean = true, userId?: string | null): void {
  if (typeof window === 'undefined') return;
  
  try {
    const stored: StoredAvatar = {
      version: AVATAR_STORAGE_VERSION,
      config,
      timestamp: Date.now(),
    };
    
    const json = JSON.stringify(stored);
    
    // Check storage size (rough estimate)
    const sizeInBytes = new Blob([json]).size;
    const sizeInMB = sizeInBytes / (1024 * 1024);
    
    if (sizeInMB > 5) {
      console.warn('Avatar config is large:', sizeInMB.toFixed(2), 'MB');
    }
    
    // Use user-specific key if userId provided, otherwise anonymous key
    const storageKey = getAvatarStorageKey(userId);
    
    // Mark as internal update to prevent cross-tab sync loop
    isInternalUpdate = true;
    localStorage.setItem(storageKey, json);
    isInternalUpdate = false;
    
    // Trigger custom event for cross-tab synchronization with userId in detail
    if (syncToOtherTabs) {
      window.dispatchEvent(new CustomEvent(AVATAR_STORAGE_EVENT, { 
        detail: { config, userId } 
      }));
    }
  } catch (error: any) {
    isInternalUpdate = false;
    if (error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded. Avatar config not saved.');
      // Could implement a cleanup strategy here
    } else {
      console.error('Failed to save avatar config:', error);
    }
  }
}

/**
 * Set up cross-tab synchronization listener for avatar config changes
 * 
 * This function should be called once when the app initializes to listen
 * for avatar changes in other browser tabs/windows.
 * Filters events to only sync avatars for the specified userId.
 * 
 * @param {function} callback - Callback function called when avatar changes in another tab
 * @param {string | null | undefined} userId - Optional user ID to filter events for specific user
 * @returns {function} Cleanup function to remove the listener
 * 
 * @example
 * useEffect(() => {
 *   const cleanup = setupAvatarCrossTabSync((config) => {
 *     console.log('Avatar updated in another tab:', config);
 *     setAvatarConfig(config);
 *   }, userId);
 *   return cleanup;
 * }, [userId]);
 */
export function setupAvatarCrossTabSync(callback: (config: AvatarConfig) => void, userId?: string | null): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const userKey = userId ? getAvatarStorageKey(userId) : getAvatarStorageKey(null);

  // Listen for custom storage events (for same-origin sync)
  const handleCustomEvent = (event: Event) => {
    const customEvent = event as CustomEvent<{ config: AvatarConfig; userId?: string | null }>;
    if (customEvent.detail && !isInternalUpdate) {
      // Only sync if userId matches (or both are null/undefined for anonymous)
      const eventUserId = customEvent.detail.userId;
      if ((userId === eventUserId) || (!userId && !eventUserId)) {
        callback(customEvent.detail.config);
      }
    }
  };

  // Listen for localStorage storage events (for cross-tab sync)
  const handleStorageEvent = (event: StorageEvent) => {
    // Check if this is a storage event for our user's avatar key
    if (event.key === userKey && event.newValue && !isInternalUpdate) {
      try {
        const data = JSON.parse(event.newValue) as StoredAvatar;
        if (data.config) {
          callback(data.config);
        }
      } catch (error) {
        console.error('Failed to parse avatar config from storage event:', error);
      }
    }
  };

  window.addEventListener(AVATAR_STORAGE_EVENT, handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  return () => {
    window.removeEventListener(AVATAR_STORAGE_EVENT, handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

/**
 * Clear avatar configuration from localStorage
 * 
 * Removes avatar from storage for a specific user or anonymous users.
 * Useful when logging out or switching accounts.
 * 
 * @param {string | null | undefined} userId - Optional user ID to clear user-specific avatar
 * 
 * @example
 * clearAvatarConfig(userId); // Clear specific user's avatar
 * clearAvatarConfig(); // Clear anonymous avatar
 */
export function clearAvatarConfig(userId?: string | null): void {
  if (typeof window === 'undefined') return;
  
  try {
    const storageKey = getAvatarStorageKey(userId);
    localStorage.removeItem(storageKey);
    console.log('[avatarConfig] Cleared avatar config', { userId, storageKey });
  } catch (error) {
    console.error('Failed to clear avatar config:', error);
  }
}

/**
 * Generate a unique ID for avatar config based on its content
 * 
 * Uses a simple hash function to create a deterministic ID from the config.
 * Same config will always generate the same ID, useful for caching and comparison.
 * 
 * @param {AvatarConfig} config - The avatar configuration
 * @returns {string} Unique identifier in format 'avatar-{hash}'
 * 
 * @example
 * const id1 = generateAvatarId(config);
 * const id2 = generateAvatarId(config); // id1 === id2
 */
export function generateAvatarId(config: AvatarConfig): string {
  const configString = JSON.stringify(config);
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < configString.length; i++) {
    const char = configString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `avatar-${Math.abs(hash).toString(36)}`;
}

/**
 * Create a new avatar config with default values
 * 
 * Generates a fresh avatar configuration with all default values.
 * The ID is automatically generated from the default config content.
 * 
 * @param {string} [name] - Optional custom name (defaults to 'My Avatar')
 * @returns {AvatarConfig} New avatar config with defaults
 * 
 * @example
 * const newAvatar = createDefaultAvatarConfig('Player 1');
 * // Returns config with all defaults but custom name
 */
export function createDefaultAvatarConfig(name?: string): AvatarConfig {
  return {
    ...DEFAULT_AVATAR_CONFIG,
    id: generateAvatarId(DEFAULT_AVATAR_CONFIG),
    name: name || DEFAULT_AVATAR_CONFIG.name,
  };
}

/**
 * Create a deep copy of an avatar config
 * 
 * Uses JSON serialization to create a completely independent copy.
 * Useful for creating editable copies without mutating the original.
 * 
 * @param {AvatarConfig} config - The avatar configuration to clone
 * @returns {AvatarConfig} Deep copy of the config
 * 
 * @example
 * const original = loadAvatarConfig();
 * const editable = cloneAvatarConfig(original);
 * editable.name = 'Modified';
 * // original.name is unchanged
 */
export function cloneAvatarConfig(config: AvatarConfig): AvatarConfig {
  return JSON.parse(JSON.stringify(config));
}

/**
 * Encode avatar config to JSON string for network transmission
 * 
 * Converts the config object to a JSON string suitable for sending
 * over the network (socket.io, HTTP, etc.).
 * 
 * @param {AvatarConfig} config - The avatar configuration to encode
 * @returns {string} JSON string representation of the config
 * 
 * @example
 * const encoded = encodeAvatarConfig(config);
 * socket.emit('join-room', { avatar: encoded });
 */
export function encodeAvatarConfig(config: AvatarConfig): string {
  return JSON.stringify(config);
}

/**
 * Decode avatar config from JSON string
 * 
 * Parses a JSON string back into an AvatarConfig object.
 * Returns null if parsing fails (invalid JSON or structure).
 * 
 * @param {string} encoded - JSON string representation of the config
 * @returns {AvatarConfig | null} Decoded config, or null if decoding fails
 * 
 * @example
 * const decoded = decodeAvatarConfig(encodedString);
 * if (decoded) {
 *   console.log('Decoded avatar:', decoded.name);
 * }
 */
export function decodeAvatarConfig(encoded: string): AvatarConfig | null {
  try {
    const parsed = JSON.parse(encoded);
    if (!parsed || typeof parsed !== "object" || !parsed.name) return null;
    return migrateAvatarConfig(parsed, 0);
  } catch (error) {
    console.error('Failed to decode avatar config:', error);
    return null;
  }
}

/**
 * Save avatar configuration with optional backend sync
 * 
 * This is a convenience wrapper that saves locally and optionally syncs with backend.
 * Use this when you want to handle both local and remote storage in one call.
 * 
 * @param {AvatarConfig} config - The avatar configuration to save
 * @param {function} [backendSyncFn] - Optional function to sync with backend (e.g., API call)
 * @param {string | null | undefined} userId - Optional user ID to save to user-specific storage
 * @returns {Promise<void>} Promise that resolves when save completes (backend sync may happen asynchronously)
 * 
 * @example
 * await saveAvatarConfigWithSync(config, async (encoded) => {
 *   await updateAvatar(encoded);
 * }, userId);
 */
export async function saveAvatarConfigWithSync(
  config: AvatarConfig,
  backendSyncFn?: (encoded: string) => Promise<void>,
  userId?: string | null
): Promise<void> {
  // Always save locally first for immediate availability
  saveAvatarConfig(config, true, userId);
  
  // If backend sync function is provided, sync to backend
  if (backendSyncFn) {
    try {
      const encoded = encodeAvatarConfig(config);
      await backendSyncFn(encoded);
    } catch (error) {
      console.error('Failed to sync avatar to backend:', error);
      // Don't throw - local save succeeded, backend sync can be retried later
    }
  }
}

