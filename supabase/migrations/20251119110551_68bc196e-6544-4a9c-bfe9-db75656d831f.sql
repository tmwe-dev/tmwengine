-- INCREMENTO 10: Learning System - Feedback & Performance Metrics

-- Tabella per feedback utente su azioni AI
CREATE TABLE email_ai_learning_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email_id UUID REFERENCES email_messages(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('classification', 'action_decision', 'auto_execute')),
  ai_suggestion TEXT NOT NULL,
  user_feedback TEXT NOT NULL CHECK (user_feedback IN ('approved', 'rejected', 'modified')),
  user_correction TEXT,
  confidence_score NUMERIC(3,2),
  sender_email TEXT,
  email_category TEXT,
  feedback_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabella per metriche di performance aggregate (cache)
CREATE TABLE email_ai_performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('classification_accuracy', 'action_accuracy', 'sender_accuracy')),
  context_key TEXT,
  total_actions INTEGER DEFAULT 0,
  approved_actions INTEGER DEFAULT 0,
  rejected_actions INTEGER DEFAULT 0,
  accuracy_rate NUMERIC(5,2),
  avg_confidence NUMERIC(3,2),
  last_updated TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, metric_type, context_key)
);

-- Indici per performance
CREATE INDEX idx_learning_feedback_user ON email_ai_learning_feedback(user_id);
CREATE INDEX idx_learning_feedback_sender ON email_ai_learning_feedback(sender_email);
CREATE INDEX idx_learning_feedback_category ON email_ai_learning_feedback(email_category);
CREATE INDEX idx_learning_feedback_created ON email_ai_learning_feedback(created_at DESC);

CREATE INDEX idx_performance_metrics_user ON email_ai_performance_metrics(user_id);
CREATE INDEX idx_performance_metrics_context ON email_ai_performance_metrics(context_key);

-- RLS Policies
ALTER TABLE email_ai_learning_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own learning feedback"
ON email_ai_learning_feedback FOR ALL
USING (auth.uid() = user_id);

ALTER TABLE email_ai_performance_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own metrics"
ON email_ai_performance_metrics FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users update own metrics"
ON email_ai_performance_metrics FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own metrics"
ON email_ai_performance_metrics FOR INSERT
WITH CHECK (auth.uid() = user_id);