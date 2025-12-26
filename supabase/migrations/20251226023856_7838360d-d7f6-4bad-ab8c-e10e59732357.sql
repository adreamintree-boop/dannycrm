-- Create email_accounts table for Nylas integration
CREATE TABLE public.email_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'google',
  grant_id TEXT NOT NULL,
  email_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'connected',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id),
  UNIQUE(grant_id)
);

-- Enable RLS
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_accounts
CREATE POLICY "Users can view their own email accounts"
ON public.email_accounts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email accounts"
ON public.email_accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email accounts"
ON public.email_accounts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email accounts"
ON public.email_accounts
FOR DELETE
USING (auth.uid() = user_id);

-- Add Nylas-specific columns to sales_activity_logs
ALTER TABLE public.sales_activity_logs
ADD COLUMN IF NOT EXISTS from_email TEXT,
ADD COLUMN IF NOT EXISTS to_emails JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS cc_emails JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS bcc_emails JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS snippet TEXT,
ADD COLUMN IF NOT EXISTS body_html TEXT,
ADD COLUMN IF NOT EXISTS body_text TEXT,
ADD COLUMN IF NOT EXISTS nylas_message_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS nylas_thread_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON public.email_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_activity_logs_nylas_message_id ON public.sales_activity_logs(nylas_message_id);

-- Add trigger for updated_at
CREATE TRIGGER update_email_accounts_updated_at
BEFORE UPDATE ON public.email_accounts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();