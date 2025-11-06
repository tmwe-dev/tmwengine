-- Add batch checkpointing support to ai_categorization_progress
ALTER TABLE ai_categorization_progress 
ADD COLUMN IF NOT EXISTS last_processed_index INTEGER DEFAULT 0;

-- Create index for optimized queries
CREATE INDEX IF NOT EXISTS idx_progress_status_batch 
ON ai_categorization_progress(batch_id, status);

COMMENT ON COLUMN ai_categorization_progress.last_processed_index IS 'Index of last successfully processed sender for resume capability';