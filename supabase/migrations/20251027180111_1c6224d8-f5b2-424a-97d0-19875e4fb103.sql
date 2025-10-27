-- Step 1: Aggiorna conversazioni che usano prompt duplicati al prompt attivo corrente
UPDATE chat_laboratory_conversations
SET system_prompt_id = '5d4d2056-1e61-4eba-aa17-4286075f48c2'
WHERE system_prompt_id IN (
  '6584b2dc-1234-4670-91a0-1037dd90d3c1',
  'ff25b9f0-5631-490f-bec8-0607a68454a4',
  '0933f413-9cec-4861-b5d1-8f297bbf7ba8',
  'ddf713d8-8e5f-4722-a71a-5ecab599f81d',
  '37ccb6f3-9839-42ac-90d9-6dbdbaef490c'
);

-- Step 2: Elimina i 5 prompt duplicati
DELETE FROM chat_laboratory_system_prompts 
WHERE id IN (
  '6584b2dc-1234-4670-91a0-1037dd90d3c1',
  'ff25b9f0-5631-490f-bec8-0607a68454a4',
  '0933f413-9cec-4861-b5d1-8f297bbf7ba8',
  'ddf713d8-8e5f-4722-a71a-5ecab599f81d',
  '37ccb6f3-9839-42ac-90d9-6dbdbaef490c'
)
AND attivo = false;