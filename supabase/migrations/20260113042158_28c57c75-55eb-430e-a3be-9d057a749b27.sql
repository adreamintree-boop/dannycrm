-- Create move_history table for tracking buyer changes persistently
CREATE TABLE public.move_history (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('funnel', 'activity', 'document')),
    description TEXT NOT NULL,
    author TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.move_history ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own move history" 
ON public.move_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own move history" 
ON public.move_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own move history" 
ON public.move_history 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_move_history_user_id ON public.move_history(user_id);
CREATE INDEX idx_move_history_project_id ON public.move_history(project_id);
CREATE INDEX idx_move_history_created_at ON public.move_history(created_at DESC);