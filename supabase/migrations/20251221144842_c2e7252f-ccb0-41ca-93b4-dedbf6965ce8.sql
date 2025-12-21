-- Create company survey table
CREATE TABLE public.company_surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_website TEXT,
  company_description TEXT,
  year_founded INTEGER,
  employee_count TEXT,
  core_strengths TEXT,
  export_experience TEXT,
  existing_markets TEXT[],
  certifications TEXT[],
  catalog_file_url TEXT,
  intro_file_url TEXT,
  target_regions TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Create products table for repeatable product entries
CREATE TABLE public.company_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.company_surveys(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  product_description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_products ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_surveys
CREATE POLICY "Users can view their own survey"
ON public.company_surveys
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own survey"
ON public.company_surveys
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own survey"
ON public.company_surveys
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own survey"
ON public.company_surveys
FOR DELETE
USING (auth.uid() = user_id);

-- RLS policies for company_products
CREATE POLICY "Users can view their own products"
ON public.company_products
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.company_surveys 
  WHERE id = company_products.survey_id AND user_id = auth.uid()
));

CREATE POLICY "Users can insert their own products"
ON public.company_products
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.company_surveys 
  WHERE id = company_products.survey_id AND user_id = auth.uid()
));

CREATE POLICY "Users can update their own products"
ON public.company_products
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.company_surveys 
  WHERE id = company_products.survey_id AND user_id = auth.uid()
));

CREATE POLICY "Users can delete their own products"
ON public.company_products
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.company_surveys 
  WHERE id = company_products.survey_id AND user_id = auth.uid()
));

-- Trigger for updated_at
CREATE TRIGGER update_company_surveys_updated_at
BEFORE UPDATE ON public.company_surveys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();