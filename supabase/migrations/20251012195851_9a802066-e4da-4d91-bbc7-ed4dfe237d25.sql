-- Add intent_tags column to chat_laboratory_messages
ALTER TABLE chat_laboratory_messages
ADD COLUMN intent_tags JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN chat_laboratory_messages.intent_tags IS 'Array of intent classifications: Proposal, Critique, Question, Evidence, Merge, Vote, Summarize, Meta';

-- Create index for intent_tags queries
CREATE INDEX idx_lab_messages_intent_tags ON chat_laboratory_messages USING GIN (intent_tags);

-- Add convergence_metrics to chat_laboratory_conversations
ALTER TABLE chat_laboratory_conversations
ADD COLUMN convergence_metrics JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN chat_laboratory_conversations.convergence_metrics IS 'Current convergence metrics: {A: agreement_ratio, C: contradiction_rate, P: progress_coverage, level: diverging|converging|lock}';