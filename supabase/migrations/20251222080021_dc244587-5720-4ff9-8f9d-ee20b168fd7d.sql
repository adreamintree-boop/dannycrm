-- Create storage bucket for survey files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'survey-files', 
  'survey-files', 
  false,
  31457280, -- 30MB in bytes
  ARRAY['application/pdf', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- Create survey_files table for file metadata
CREATE TABLE public.survey_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  survey_id UUID REFERENCES public.company_surveys(id) ON DELETE CASCADE,
  file_type TEXT NOT NULL CHECK (file_type IN ('product_catalog', 'company_introduction')),
  original_file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on survey_files
ALTER TABLE public.survey_files ENABLE ROW LEVEL SECURITY;

-- RLS policies for survey_files
CREATE POLICY "Users can view their own files"
ON public.survey_files
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own files"
ON public.survey_files
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own files"
ON public.survey_files
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own files"
ON public.survey_files
FOR DELETE
USING (auth.uid() = user_id);

-- Storage policies for survey-files bucket
CREATE POLICY "Users can upload their own survey files"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'survey-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own survey files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'survey-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own survey files"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'survey-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own survey files"
ON storage.objects
FOR DELETE
USING (bucket_id = 'survey-files' AND auth.uid()::text = (storage.foldername(name))[1]);