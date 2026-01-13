-- Add columns for progressive report generation
ALTER TABLE public.strategy_reports 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS sections jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS summary_markdown text;

-- Add constraint for valid status values
ALTER TABLE public.strategy_reports 
ADD CONSTRAINT strategy_reports_status_check 
CHECK (status IN ('pending', 'generating', 'completed', 'error'));

-- Update existing reports to 'completed' status
UPDATE public.strategy_reports SET status = 'completed' WHERE status = 'pending';

-- Add UPDATE policy (drop first if exists to avoid errors)
DROP POLICY IF EXISTS "Users can update their own reports" ON public.strategy_reports;
CREATE POLICY "Users can update their own reports" 
ON public.strategy_reports 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create index for faster user queries
CREATE INDEX IF NOT EXISTS idx_strategy_reports_user_status 
ON public.strategy_reports(user_id, status);