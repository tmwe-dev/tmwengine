-- Abilita estensioni necessarie per cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Crea job per sync automatica ogni 4 ore
SELECT cron.schedule(
  'tmwe-email-auto-sync',
  '0 */4 * * *', -- Ogni 4 ore
  $$
  SELECT
    net.http_post(
        url:='https://dlldkrzoxvjxpgkkttxu.supabase.co/functions/v1/tmwe-email-sync-master',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbGRrcnpveHZqeHBna2t0dHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjA1ODQsImV4cCI6MjA3NDI5NjU4NH0.PrHXldlTqbNm63S90_Wo4bFcFeSBMVeSxjJpUxoKf5A"}'::jsonb,
        body:='{"mode": "continuous", "folder_name": "INBOX"}'::jsonb
    ) as request_id;
  $$
);