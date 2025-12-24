-- Create country_master table for permanent country storage
CREATE TABLE public.country_master (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  iso2 TEXT NOT NULL UNIQUE,
  iso3 TEXT,
  name_ko TEXT NOT NULL,
  name_en TEXT NOT NULL,
  region TEXT,
  subregion TEXT,
  search_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for search
CREATE INDEX idx_country_master_search ON public.country_master USING gin(to_tsvector('simple', search_text));
CREATE INDEX idx_country_master_iso2 ON public.country_master (iso2);
CREATE INDEX idx_country_master_name_ko ON public.country_master (name_ko);

-- Enable RLS
ALTER TABLE public.country_master ENABLE ROW LEVEL SECURITY;

-- Allow public read access (country list is not sensitive)
CREATE POLICY "Anyone can view countries" 
ON public.country_master 
FOR SELECT 
USING (true);

-- Only authenticated users can modify (for admin purposes)
CREATE POLICY "Authenticated users can insert countries" 
ON public.country_master 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update countries" 
ON public.country_master 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_country_master_updated_at
BEFORE UPDATE ON public.country_master
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();