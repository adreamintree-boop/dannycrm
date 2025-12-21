-- Create email_threads table
CREATE TABLE public.email_threads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_messages table
CREATE TABLE public.email_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id UUID REFERENCES public.email_threads(id) ON DELETE CASCADE,
  owner_user_id UUID NOT NULL,
  mailbox TEXT NOT NULL DEFAULT 'inbox',
  direction TEXT NOT NULL DEFAULT 'inbound',
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_emails JSONB NOT NULL DEFAULT '[]'::jsonb,
  cc_emails JSONB DEFAULT '[]'::jsonb,
  bcc_emails JSONB DEFAULT '[]'::jsonb,
  subject TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  snippet TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  is_starred BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create email_activity_log table
CREATE TABLE public.email_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  message_id UUID REFERENCES public.email_messages(id) ON DELETE SET NULL,
  thread_id UUID REFERENCES public.email_threads(id) ON DELETE SET NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.email_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_activity_log ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_threads
CREATE POLICY "Users can view their own threads"
ON public.email_threads FOR SELECT
USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can insert their own threads"
ON public.email_threads FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update their own threads"
ON public.email_threads FOR UPDATE
USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete their own threads"
ON public.email_threads FOR DELETE
USING (auth.uid() = owner_user_id);

-- RLS policies for email_messages
CREATE POLICY "Users can view their own messages"
ON public.email_messages FOR SELECT
USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can insert their own messages"
ON public.email_messages FOR INSERT
WITH CHECK (auth.uid() = owner_user_id);

CREATE POLICY "Users can update their own messages"
ON public.email_messages FOR UPDATE
USING (auth.uid() = owner_user_id);

CREATE POLICY "Users can delete their own messages"
ON public.email_messages FOR DELETE
USING (auth.uid() = owner_user_id);

-- RLS policies for email_activity_log
CREATE POLICY "Users can view their own activity logs"
ON public.email_activity_log FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own activity logs"
ON public.email_activity_log FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_email_messages_owner_mailbox ON public.email_messages(owner_user_id, mailbox);
CREATE INDEX idx_email_messages_thread ON public.email_messages(thread_id);
CREATE INDEX idx_email_threads_owner ON public.email_threads(owner_user_id);
CREATE INDEX idx_email_activity_log_user ON public.email_activity_log(user_id);

-- Trigger to update email_threads.updated_at
CREATE TRIGGER update_email_threads_updated_at
BEFORE UPDATE ON public.email_threads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();