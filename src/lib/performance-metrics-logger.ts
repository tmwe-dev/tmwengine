import { supabase } from "@/integrations/supabase/client";

export interface PerformanceMetrics {
  test_type: string;
  folder: string;
  batch_size: number;
  throughput: number;
  success_rate: number;
  avg_time_per_email: number;
  errors: number;
  retry_count?: number;
  circuit_breaker_triggered?: boolean;
}

export async function logPerformanceMetrics(metrics: PerformanceMetrics) {
  try {
    // TODO: Create email_performance_tests table in Supabase
    // For now, just log to console
    console.log('📊 Performance Metrics:', {
      ...metrics,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.warn('Error logging metrics:', err);
  }
}
