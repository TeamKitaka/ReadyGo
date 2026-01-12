-- Fix game_start_logs context_type constraint
-- 이 스크립트를 Supabase 대시보드의 SQL Editor에서 실행하세요

DO $$
BEGIN
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
