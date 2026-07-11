/**
 * Verification utilities for avatar config system
 * 
 * This file contains functions to manually verify the versioning system
 * and migration paths. Can be run in browser console for testing.
 */

import {
  AvatarConfig,
  DEFAULT_AVATAR_CONFIG,
  loadAvatarConfig,
  saveAvatarConfig,
  generateAvatarId,
  createDefaultAvatarConfig,
  cloneAvatarConfig,
  encodeAvatarConfig,
  decodeAvatarConfig,
} from './avatar/config';

/**
 * Test versioning and migration system
 * 
 * Run this in browser console to verify versioning works:
 * ```ts
 * import { verifyVersioning } from './lib/avatarConfig.verification';
 * verifyVersioning();
 * ```
 */
export function verifyVersioning() {
  console.log('=== Avatar Config Versioning Verification ===\n');

  // Test 1: Save and load current version
  console.log('Test 1: Save and load current version');
  const testConfig = createDefaultAvatarConfig('Test Avatar');
  saveAvatarConfig(testConfig);
  const loaded = loadAvatarConfig();
  
  if (loaded && loaded.name === 'Test Avatar') {
    console.log('✅ PASS: Current version save/load works');
  } else {
    console.error('❌ FAIL: Current version save/load failed');
    return false;
  }

  // Test 2: Verify versioned storage format
  console.log('\nTest 2: Verify storage format includes version');
  const stored = localStorage.getItem('paint-and-guess-avatar-config');
  if (stored) {
    const parsed = JSON.parse(stored);
    if (parsed.version === 1 && parsed.config && parsed.timestamp) {
      console.log('✅ PASS: Storage format is correct');
    } else {
      console.error('❌ FAIL: Storage format is incorrect');
      return false;
    }
  }

  // Test 3: Test legacy format migration (version 0)
  console.log('\nTest 3: Test legacy format migration');
  const legacyConfig = { ...DEFAULT_AVATAR_CONFIG, name: 'Legacy Avatar' };
  localStorage.setItem('paint-and-guess-avatar-config', JSON.stringify(legacyConfig));
  
  const migrated = loadAvatarConfig();
  if (migrated) {
    // Check that it was saved with version
    const saved = localStorage.getItem('paint-and-guess-avatar-config');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.version === 1) {
        console.log('✅ PASS: Legacy format migration works');
      } else {
        console.error('❌ FAIL: Migration did not save with version');
        return false;
      }
    }
  } else {
    console.error('❌ FAIL: Legacy migration failed');
    return false;
  }

  // Test 4: Test corrupted data handling
  console.log('\nTest 4: Test corrupted data handling');
  localStorage.setItem('paint-and-guess-avatar-config', 'invalid json {');
  const corrupted = loadAvatarConfig();
  
  if (corrupted === null) {
    // Should clear corrupted data
    const cleared = localStorage.getItem('paint-and-guess-avatar-config');
    if (cleared === null) {
      console.log('✅ PASS: Corrupted data handled and cleared');
    } else {
      console.error('❌ FAIL: Corrupted data not cleared');
      return false;
    }
  } else {
    console.error('❌ FAIL: Should return null for corrupted data');
    return false;
  }

  // Test 5: Test ID generation determinism
  console.log('\nTest 5: Test ID generation determinism');
  const config1 = createDefaultAvatarConfig('Same Config');
  const config2 = createDefaultAvatarConfig('Same Config');
  const id1 = generateAvatarId(config1);
  const id2 = generateAvatarId(config2);
  
  if (id1 === id2) {
    console.log('✅ PASS: ID generation is deterministic');
  } else {
    console.error('❌ FAIL: ID generation is not deterministic');
    return false;
  }

  // Test 6: Test encoding/decoding
  console.log('\nTest 6: Test encoding/decoding');
  const original = createDefaultAvatarConfig('Encoded Avatar');
  const encoded = encodeAvatarConfig(original);
  const decoded = decodeAvatarConfig(encoded);
  
  if (decoded && decoded.name === 'Encoded Avatar' && decoded.id === original.id) {
    console.log('✅ PASS: Encoding/decoding works');
  } else {
    console.error('❌ FAIL: Encoding/decoding failed');
    return false;
  }

  // Test 7: Test clone independence
  console.log('\nTest 7: Test clone independence');
  const original2 = createDefaultAvatarConfig('Original');
  const cloned = cloneAvatarConfig(original2);
  cloned.name = 'Cloned';
  cloned.hair.style = 'long';
  
  if (original2.name === 'Original' && original2.hair.style === 'short') {
    console.log('✅ PASS: Clone is independent');
  } else {
    console.error('❌ FAIL: Clone is not independent');
    return false;
  }

  console.log('\n=== All Tests Passed ===');
  return true;
}

/**
 * Test migration from specific version
 */
export function testMigration(fromVersion: number, testData: any) {
  console.log(`Testing migration from version ${fromVersion}`);
  
  // Simulate old version storage
  const oldStorage = {
    version: fromVersion,
    config: testData,
    timestamp: Date.now(),
  };
  
  localStorage.setItem('paint-and-guess-avatar-config', JSON.stringify(oldStorage));
  
  const migrated = loadAvatarConfig();
  
  if (migrated) {
    console.log('✅ Migration successful');
    console.log('Migrated config:', migrated);
    return true;
  } else {
    console.error('❌ Migration failed');
    return false;
  }
}

/**
 * Get storage information for debugging
 */
export function getStorageInfo() {
  const stored = localStorage.getItem('paint-and-guess-avatar-config');
  
  if (!stored) {
    console.log('No avatar config stored');
    return null;
  }
  
  try {
    const parsed = JSON.parse(stored);
    const size = new Blob([stored]).size;
    
    return {
      version: parsed.version,
      timestamp: parsed.timestamp ? new Date(parsed.timestamp).toISOString() : 'N/A',
      size: `${(size / 1024).toFixed(2)} KB`,
      configId: parsed.config?.id,
      configName: parsed.config?.name,
    };
  } catch (error) {
    console.error('Failed to parse storage:', error);
    return null;
  }
}

// Make functions available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).avatarConfigVerification = {
    verifyVersioning,
    testMigration,
    getStorageInfo,
  };
}

