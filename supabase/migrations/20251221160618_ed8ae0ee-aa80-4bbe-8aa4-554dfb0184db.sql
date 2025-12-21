-- Add is_logged_to_crm column to email_messages
ALTER TABLE public.email_messages 
ADD COLUMN IF NOT EXISTS is_logged_to_crm BOOLEAN NOT NULL DEFAULT false;

-- Create sales_activity_logs table
CREATE TABLE public.sales_activity_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  buyer_id UUID REFERENCES public.crm_buyers(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'email',
  direction TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  email_message_id UUID REFERENCES public.email_messages(id) ON DELETE SET NULL,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sales_activity_logs
ALTER TABLE public.sales_activity_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for sales_activity_logs
CREATE POLICY "Users can view their own activity logs"
ON public.sales_activity_logs FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own activity logs"
ON public.sales_activity_logs FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own activity logs"
ON public.sales_activity_logs FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own activity logs"
ON public.sales_activity_logs FOR DELETE
USING (auth.uid() = created_by);

-- Create indexes for performance
CREATE INDEX idx_sales_activity_logs_buyer ON public.sales_activity_logs(buyer_id);
CREATE INDEX idx_sales_activity_logs_project ON public.sales_activity_logs(project_id);
CREATE INDEX idx_sales_activity_logs_email ON public.sales_activity_logs(email_message_id);
CREATE INDEX idx_sales_activity_logs_created_by ON public.sales_activity_logs(created_by);
CREATE INDEX idx_email_messages_logged ON public.email_messages(is_logged_to_crm);