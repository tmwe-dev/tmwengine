/**
 * TMWE Library - Main Entry Point
 * 
 * Unified TMWE integration layer for TMWEngine
 * Provides authentication, API access, and feature flags
 */

// Core managers
export { TMWEAuthManager } from './TMWEAuthManager';
export { TMWEApiClient } from './TMWEApiClient';
export type { TMWEApiRequest, TMWEApiResponse } from './TMWEApiClient';

// Configuration
export { 
  TMWE_FEATURE_FLAGS,
  isFeatureEnabled,
  getEnabledFeatures,
  getMigrationPhase,
  logMigrationStatus
} from './config';

// API modules (re-export for convenience)
export * from './api';
