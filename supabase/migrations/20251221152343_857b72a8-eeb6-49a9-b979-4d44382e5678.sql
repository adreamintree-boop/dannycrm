-- Create action_type enum for credit ledger
CREATE TYPE public.credit_action_type AS ENUM ('INIT_GRANT', 'BL_SEARCH', 'STRATEGY');

-- Create user_credits table
CREATE TABLE public.user_credits (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 300 CHECK (balance >= 0),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_credits
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_credits
CREATE POLICY "Users can view their own credits"
ON public.user_credits
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits"
ON public.user_credits
FOR UPDATE
USING (auth.uid() = user_id);

-- Create credit_ledger table
CREATE TABLE public.credit_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type public.credit_action_type NOT NULL,
  amount INTEGER NOT NULL,
  request_id UUID,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Unique constraint for idempotency
  UNIQUE (user_id, request_id)
);

-- Enable RLS on credit_ledger
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

-- RLS policies for credit_ledger
CREATE POLICY "Users can view their own ledger"
ON public.credit_ledger
FOR SELECT
USING (auth.uid() = user_id);

-- Trigger to update user_credits.updated_at
CREATE TRIGGER update_user_credits_updated_at
BEFORE UPDATE ON public.user_credits
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to initialize credits for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create user_credits row
  INSERT INTO public.user_credits (user_id, balance)
  VALUES (new.id, 300);
  
  -- Create initial grant ledger entry
  INSERT INTO public.credit_ledger (user_id, action_type, amount, meta)
  VALUES (new.id, 'INIT_GRANT', 300, '{"reason": "signup_bonus"}'::jsonb);
  
  RETURN new;
END;
$$;

-- Trigger to initialize credits on user signup
CREATE TRIGGER on_auth_user_created_credits
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_credits();

-- Function to deduct credits atomically (used by edge functions)
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id UUID,
  p_amount INTEGER,
  p_action_type public.credit_action_type,
  p_request_id UUID,
  p_meta JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE (success BOOLEAN, new_balance INTEGER, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance INTEGER;
  v_new_balance INTEGER;
BEGIN
  -- Check if request_id already processed (idempotency)
  IF p_request_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.credit_ledger 
    WHERE user_id = p_user_id AND request_id = p_request_id
  ) THEN
    -- Already processed, return current balance
    SELECT balance INTO v_current_balance FROM public.user_credits WHERE user_id = p_user_id;
    RETURN QUERY SELECT TRUE, v_current_balance, NULL::TEXT;
    RETURN;
  END IF;

  -- Lock and get current balance
  SELECT balance INTO v_current_balance
  FROM public.user_credits
  WHERE user_id = p_user_id
  FOR UPDATE;
  
  -- Check if user has credits record
  IF v_current_balance IS NULL THEN
    RETURN QUERY SELECT FALSE, 0, 'No credits record found'::TEXT;
    RETURN;
  END IF;
  
  -- Check sufficient balance
  IF v_current_balance < p_amount THEN
    RETURN QUERY SELECT FALSE, v_current_balance, 
      format('크레딧이 부족합니다. (필요: %s, 보유: %s)', p_amount, v_current_balance)::TEXT;
    RETURN;
  END IF;
  
  -- Deduct credits
  v_new_balance := v_current_balance - p_amount;
  UPDATE public.user_credits SET balance = v_new_balance WHERE user_id = p_user_id;
  
  -- Insert ledger entry
  INSERT INTO public.credit_ledger (user_id, action_type, amount, request_id, meta)
  VALUES (p_user_id, p_action_type, -p_amount, p_request_id, p_meta);
  
  RETURN QUERY SELECT TRUE, v_new_balance, NULL::TEXT;
END;
$$;

-- Function to get user credit balance
CREATE OR REPLACE FUNCTION public.get_credit_balance(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(balance, 0) FROM public.user_credits WHERE user_id = p_user_id;
$$;

-- Backfill existing users who don't have credits
INSERT INTO public.user_credits (user_id, balance)
SELECT id, 300 FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.user_credits)
ON CONFLICT (user_id) DO NOTHING;

-- Create ledger entries for backfilled users
INSERT INTO public.credit_ledger (user_id, action_type, amount, meta)
SELECT uc.user_id, 'INIT_GRANT', 300, '{"reason": "backfill_existing_user"}'::jsonb
FROM public.user_credits uc
WHERE NOT EXISTS (
  SELECT 1 FROM public.credit_ledger cl 
  WHERE cl.user_id = uc.user_id AND cl.action_type = 'INIT_GRANT'
);