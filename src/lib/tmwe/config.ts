/**
 * TMWE Feature Flags Configuration
 * 
 * Controls gradual migration from legacy tables to new optimized tables
 * 
 * Migration Strategy:
 * - Phase 1 (Sprint 1-3): Coexistence - new tables active, legacy READ-ONLY
 * - Phase 2 (Sprint 4-6): Gradual migration - new data only in new tables
 * - Phase 3 (Sprint 7+): Deprecation - legacy tables archived
 */

export const TMWE_FEATURE_FLAGS = {
  /**
   * Use tmwe_classifications table instead of email_ai_classifications
   * Benefits:
   * - tmwe_email_id as PRIMARY KEY (no UUID overhead)
   * - subject_preview for fast list rendering
   * - No dependency on local message_id
   */
  USE_TMWE_CLASSIFICATIONS: true,

  /**
   * Use tmwe_sender_profiles table (unified groups + mappings)
   * Benefits:
   * - Single table for sender configuration
   * - Integrated statistics (denormalized for performance)
   * - No complex JOINs between groups and mappings
   */
  USE_TMWE_SENDER_PROFILES: true,

  /**
   * Use tmwe_classification_rules table (simplified rules)
   * Benefits:
   * - Scope-based rules (global, sender, domain, subject)
   * - Client-side matching (no foreign keys)
   * - Simpler priority system
   */
  USE_TMWE_RULES: true,

  /**
   * Enable fallback to legacy tables if new tables fail
   * Recommended: keep true during migration phase
   */
  ENABLE_LEGACY_FALLBACK: true,

  /**
   * Show migration banner in UI
   * Informs users about new features and migration progress
   */
  SHOW_MIGRATION_BANNER: true,

  /**
   * Enable debug logging for migration
   * Useful during development and testing
   */
  DEBUG_MIGRATION: false,
} as const;

/**
 * Check if a feature flag is enabled
 */
export function isFeatureEnabled(flag: keyof typeof TMWE_FEATURE_FLAGS): boolean {
  return TMWE_FEATURE_FLAGS[flag];
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): string[] {
  return Object.entries(TMWE_FEATURE_FLAGS)
    .filter(([_, enabled]) => enabled)
    .map(([flag]) => flag);
}

/**
 * Migration phase detection
 */
export function getMigrationPhase(): 'coexistence' | 'migration' | 'deprecated' {
  const newTablesEnabled = 
    TMWE_FEATURE_FLAGS.USE_TMWE_CLASSIFICATIONS &&
    TMWE_FEATURE_FLAGS.USE_TMWE_SENDER_PROFILES &&
    TMWE_FEATURE_FLAGS.USE_TMWE_RULES;

  const legacyFallbackEnabled = TMWE_FEATURE_FLAGS.ENABLE_LEGACY_FALLBACK;

  if (newTablesEnabled && legacyFallbackEnabled) {
    return 'coexistence'; // Phase 1: Both systems active
  }

  if (newTablesEnabled && !legacyFallbackEnabled) {
    return 'migration'; // Phase 2: New tables only
  }

  return 'deprecated'; // Phase 3: Legacy deprecated
}

/**
 * Log migration status (only if debug enabled)
 */
export function logMigrationStatus(): void {
  if (!TMWE_FEATURE_FLAGS.DEBUG_MIGRATION) return;

  console.log('🔄 [TMWE Migration Status]');
  console.log('  Phase:', getMigrationPhase());
  console.log('  Enabled features:', getEnabledFeatures());
  console.log('  Classification table:', TMWE_FEATURE_FLAGS.USE_TMWE_CLASSIFICATIONS ? 'tmwe_classifications' : 'email_ai_classifications');
  console.log('  Sender profiles:', TMWE_FEATURE_FLAGS.USE_TMWE_SENDER_PROFILES ? 'tmwe_sender_profiles' : 'email_sender_groups + mappings');
  console.log('  Rules:', TMWE_FEATURE_FLAGS.USE_TMWE_RULES ? 'tmwe_classification_rules' : 'email_sender_rules');
}
