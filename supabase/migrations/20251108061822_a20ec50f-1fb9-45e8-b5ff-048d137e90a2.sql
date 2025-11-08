-- Brain AI Tasks Table for Multi-Round Collaborative Discussion
CREATE TABLE brain_ai_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES chat_laboratory_conversations(id) ON DELETE CASCADE,
  round_number integer DEFAULT 1,
  task_type text NOT NULL,
  input_data jsonb NOT NULL,
  
  -- AI Agent info
  assigned_agent text NOT NULL,
  agent_order integer NOT NULL,
  
  -- Execution state
  status text DEFAULT 'queued',
  
  -- Results
  output_data jsonb,
  error_message text,
  
  -- Context cumulativo
  previous_responses jsonb,
  
  -- Metadata
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer
);

-- Indici per performance
CREATE INDEX idx_brain_tasks_conv ON brain_ai_tasks(conversation_id);
CREATE INDEX idx_brain_tasks_status ON brain_ai_tasks(status);
CREATE INDEX idx_brain_tasks_round ON brain_ai_tasks(conversation_id, round_number);
CREATE INDEX idx_brain_tasks_user ON brain_ai_tasks(user_id);

-- RLS Policies
ALTER TABLE brain_ai_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks"
  ON brain_ai_tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own tasks"
  ON brain_ai_tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role can update tasks"
  ON brain_ai_tasks FOR UPDATE
  USING (true);