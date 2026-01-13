-- Create email_script_runs table to store EP-06 email script generations
CREATE TABLE public.email_script_runs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    buyer_id UUID REFERENCES public.crm_buyers(id) ON DELETE SET NULL,
    stage TEXT NOT NULL CHECK (stage IN ('initial', 'follow_up', 'reply')),
    subject_lines JSONB NOT NULL DEFAULT '[]'::jsonb,
    body TEXT NOT NULL,
    internal_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.email_script_runs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own email script runs"
    ON public.email_script_runs
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own email script runs"
    ON public.email_script_runs
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own email script runs"
    ON public.email_script_runs
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own email script runs"
    ON public.email_script_runs
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_email_script_runs_user_id ON public.email_script_runs(user_id);
CREATE INDEX idx_email_script_runs_buyer_id ON public.email_script_runs(buyer_id);