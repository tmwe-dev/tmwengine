-- Rimuovi il vecchio cron job (ogni 2 minuti)
SELECT cron.unschedule('email-campagne-scheduler-job');

-- Crea nuovo cron job che chiama la funzione ogni 30 minuti
SELECT cron.schedule(
  'email-campagne-scheduler-job',
  '*/30 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://dlldkrzoxvjxpgkkttxu.supabase.co/functions/v1/email-campagne-scheduler',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbGRrcnpveHZqeHBna2t0dHh1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3MjA1ODQsImV4cCI6MjA3NDI5NjU4NH0.PrHXldlTqbNm63S90_Wo4bFcFeSBMVeSxjJpUxoKf5A"}'::jsonb,
      body := '{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);