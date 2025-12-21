-- Create table for tracking B/L search sessions
CREATE TABLE public.bl_search_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  search_key TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, search_key)
);

-- Enable RLS
ALTER TABLE public.bl_search_sessions ENABLE ROW LEVEL SECURITY;

-- RLS policies for bl_search_sessions
CREATE POLICY "Users can view their own sessions"
ON public.bl_search_sessions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
ON public.bl_search_sessions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
ON public.bl_search_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Create table for tracking charged rows per session
CREATE TABLE public.bl_search_charged_rows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.bl_search_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  row_fingerprint TEXT NOT NULL,
  charged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (session_id, row_fingerprint)
);

-- Enable RLS
ALTER TABLE public.bl_search_charged_rows ENABLE ROW LEVEL SECURITY;

-- RLS policies for bl_search_charged_rows
CREATE POLICY "Users can view their own charged rows"
ON public.bl_search_charged_rows
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own charged rows"
ON public.bl_search_charged_rows
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Trigger to update bl_search_sessions.updated_at
CREATE TRIGGER update_bl_search_sessions_updated_at
BEFORE UPDATE ON public.bl_search_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to process page-based credit charging
CREATE OR REPLACE FUNCTION public.charge_bl_search_page(
  p_user_id UUID,
  p_search_key TEXT,
  p_row_fingerprints TEXT[],
  p_page_number INTEGER,
  p_request_id UUID,
  p_meta JSONB DEFAULT '{}'::JSONB
)
RETURNS TABLE(
  success BOOLEAN,
  new_balance INTEGER,
  charged_count INTEGER,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_session_id UUID;
  v_current_balance INTEGER;
  v_new_balance INTEGER;
  v_new_fingerprints TEXT[];
  v_charged_count INTEGER;
  v_fingerprint TEXT;
BEGIN
  -- Check idempotency: if this request_id was already processed
  IF p_request_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.credit_ledger 
    WHERE user_id = p_user_id AND request_id = p_request_id
  ) THEN
    SELECT balance INTO v_current_balance FROM public.user_credits WHERE user_id = p_user_id;
    RETURN QUERY SELECT TRUE, v_current_balance, 0, NULL::TEXT;
    RETURN;
  END IF;

  -- Get or create session
  INSERT INTO public.bl_search_sessions (user_id, search_key)
  VALUES (p_user_id, p_search_key)
  ON CONFLICT (user_id, search_key) 
  DO UPDATE SET updated_at = now()
  RETURNING id INTO v_session_id;

  -- Find fingerprints that haven't been charged yet
  SELECT ARRAY_AGG(fp) INTO v_new_fingerprints
  FROM UNNEST(p_row_fingerprints) AS fp
  WHERE NOT EXISTS (
    SELECT 1 FROM public.bl_search_charged_rows
    WHERE session_id = v_session_id AND row_fingerprint = fp
  );

  -- Handle null case (all fingerprints already charged)
  IF v_new_fingerprints IS NULL THEN
    v_new_fingerprints := ARRAY[]::TEXT[];
  END IF;

  v_charged_count := COALESCE(array_length(v_new_fingerprints, 1), 0);

  -- If no new rows to charge, just return success
  IF v_charged_count = 0 THEN
    SELECT balance INTO v_current_balance FROM public.user_credits WHERE user_id = p_user_id;
    RETURN QUERY SELECT TRUE, v_current_balance, 0, NULL::TEXT;
    RETURN;
  END IF;

  -- Lock and get current balance
  SELECT balance INTO v_current_balance
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Check if user has credits record
  IF v_current_balance IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 0, 'No credits record found'::TEXT;
    RETURN;
  END IF;

  -- Check sufficient balance
  IF v_current_balance < v_charged_count THEN
    RETURN QUERY SELECT FALSE, v_current_balance, 0,
      format('크레딧이 부족합니다. (필요: %s, 보유: %s)', v_charged_count, v_current_balance)::TEXT;
    RETURN;
  END IF;

  -- Deduct credits
  v_new_balance := v_current_balance - v_charged_count;
  UPDATE public.user_credits SET balance = v_new_balance WHERE user_id = p_user_id;

  -- Insert charged rows
  FOREACH v_fingerprint IN ARRAY v_new_fingerprints
  LOOP
    INSERT INTO public.bl_search_charged_rows (session_id, user_id, row_fingerprint)
    VALUES (v_session_id, p_user_id, v_fingerprint)
    ON CONFLICT (session_id, row_fingerprint) DO NOTHING;
  END LOOP;

  -- Insert ledger entry
  INSERT INTO public.credit_ledger (user_id, action_type, amount, request_id, meta)
  VALUES (
    p_user_id, 
    'BL_SEARCH', 
    -v_charged_count, 
    p_request_id, 
    p_meta || jsonb_build_object(
      'page_number', p_page_number,
      'charged_count', v_charged_count,
      'total_rows_on_page', array_length(p_row_fingerprints, 1)
    )
  );

  RETURN QUERY SELECT TRUE, v_new_balance, v_charged_count, NULL::TEXT;
END;
$$;

-- Create index for faster session lookups
CREATE INDEX idx_bl_search_sessions_user_search ON public.bl_search_sessions(user_id, search_key);
CREATE INDEX idx_bl_search_charged_rows_session ON public.bl_search_charged_rows(session_id);

-- Cleanup old sessions (older than 7 days) - can be run periodically
CREATE OR REPLACE FUNCTION public.cleanup_old_bl_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.bl_search_sessions
  WHERE updated_at < now() - INTERVAL '7 days';
END;
$$;