-- Fix game_start_logs.context_id type from uuid to text
-- This allows storing room_id (number) and post_id (number) as strings
-- 
-- Purpose: Allow context_id to store both UUID (for match) and numeric IDs (for room_id, post_id) as strings
-- Also fix context_type check constraint to allow 'match' and 'party'

DO $$
BEGIN
  -- Check if context_id is UUID type and change to TEXT
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'game_start_logs'
    AND column_name = 'context_id'
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.game_start_logs
      ALTER COLUMN context_id TYPE text USING context_id::text;
    
    RAISE NOTICE 'Changed game_start_logs.context_id from uuid to text';
  ELSE
    RAISE NOTICE 'game_start_logs.context_id is already text type or column does not exist';
  END IF;

  -- Drop existing context_type check constraint if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.game_start_logs'::regclass
    AND conname = 'game_start_logs_context_type_check'
  ) THEN
    ALTER TABLE public.game_start_logs
      DROP CONSTRAINT game_start_logs_context_type_check;
    
    RAISE NOTICE 'Dropped existing game_start_logs_context_type_check constraint';
  END IF;

  -- Add new check constraint allowing 'match' and 'party'
  ALTER TABLE public.game_start_logs
    ADD CONSTRAINT game_start_logs_context_type_check
    CHECK (context_type IN ('match', 'party'));
  
  RAISE NOTICE 'Added game_start_logs_context_type_check constraint allowing match and party';
END$$;
