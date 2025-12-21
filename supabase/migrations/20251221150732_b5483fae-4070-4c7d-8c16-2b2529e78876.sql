-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_name TEXT NOT NULL DEFAULT '기본 프로젝트',
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for projects
CREATE POLICY "Users can view their own projects"
ON public.projects FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
ON public.projects FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
ON public.projects FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
ON public.projects FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create crm_buyers table
CREATE TABLE public.crm_buyers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  country TEXT,
  region TEXT,
  source TEXT NOT NULL DEFAULT 'BL_SEARCH',
  stage TEXT NOT NULL DEFAULT 'list' CHECK (stage IN ('list', 'lead', 'target', 'client')),
  activity_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for crm_buyers
ALTER TABLE public.crm_buyers ENABLE ROW LEVEL SECURITY;

-- RLS policies for crm_buyers
CREATE POLICY "Users can view their own buyers"
ON public.crm_buyers FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own buyers"
ON public.crm_buyers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own buyers"
ON public.crm_buyers FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own buyers"
ON public.crm_buyers FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_crm_buyers_updated_at
BEFORE UPDATE ON public.crm_buyers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();