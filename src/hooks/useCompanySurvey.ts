import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';

export interface CompanyProduct {
  id?: string;
  product_name: string;
  product_description: string;
}

export interface CompanySurvey {
  id?: string;
  company_website: string;
  company_description: string;
  year_founded: number | null;
  employee_count: string;
  core_strengths: string;
  export_experience: string;
  existing_markets: string[];
  certifications: string[];
  catalog_file_url: string;
  intro_file_url: string;
  target_regions: string[];
  products: CompanyProduct[];
}

const defaultSurvey: CompanySurvey = {
  company_website: '',
  company_description: '',
  year_founded: null,
  employee_count: '',
  core_strengths: '',
  export_experience: '',
  existing_markets: [],
  certifications: [],
  catalog_file_url: '',
  intro_file_url: '',
  target_regions: [],
  products: [{ product_name: '', product_description: '' }],
};

export function useCompanySurvey() {
  const { user } = useAuthContext();
  const [survey, setSurvey] = useState<CompanySurvey>(defaultSurvey);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSurvey, setHasSurvey] = useState(false);

  const fetchSurvey = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const { data: surveyData, error: surveyError } = await supabase
        .from('company_surveys')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (surveyError) throw surveyError;

      if (surveyData) {
        const { data: productsData, error: productsError } = await supabase
          .from('company_products')
          .select('*')
          .eq('survey_id', surveyData.id);

        if (productsError) throw productsError;

        setSurvey({
          id: surveyData.id,
          company_website: surveyData.company_website || '',
          company_description: surveyData.company_description || '',
          year_founded: surveyData.year_founded,
          employee_count: surveyData.employee_count || '',
          core_strengths: surveyData.core_strengths || '',
          export_experience: surveyData.export_experience || '',
          existing_markets: surveyData.existing_markets || [],
          certifications: surveyData.certifications || [],
          catalog_file_url: surveyData.catalog_file_url || '',
          intro_file_url: surveyData.intro_file_url || '',
          target_regions: surveyData.target_regions || [],
          products: productsData?.length 
            ? productsData.map(p => ({
                id: p.id,
                product_name: p.product_name,
                product_description: p.product_description || '',
              }))
            : [{ product_name: '', product_description: '' }],
        });
        setHasSurvey(true);
      } else {
        setSurvey(defaultSurvey);
        setHasSurvey(false);
      }
    } catch (error) {
      console.error('Error fetching survey:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSurvey();
  }, [fetchSurvey]);

  const saveSurvey = async (): Promise<{ error: Error | null }> => {
    if (!user) return { error: new Error('User not authenticated') };
    
    setIsSaving(true);
    try {
      const surveyPayload = {
        user_id: user.id,
        company_website: survey.company_website,
        company_description: survey.company_description,
        year_founded: survey.year_founded,
        employee_count: survey.employee_count,
        core_strengths: survey.core_strengths,
        export_experience: survey.export_experience,
        existing_markets: survey.existing_markets,
        certifications: survey.certifications,
        catalog_file_url: survey.catalog_file_url,
        intro_file_url: survey.intro_file_url,
        target_regions: survey.target_regions,
      };

      let surveyId = survey.id;

      if (survey.id) {
        // Update existing
        const { error } = await supabase
          .from('company_surveys')
          .update(surveyPayload)
          .eq('id', survey.id);
        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('company_surveys')
          .insert(surveyPayload)
          .select('id')
          .single();
        if (error) throw error;
        surveyId = data.id;
        setSurvey(prev => ({ ...prev, id: surveyId }));
      }

      // Delete existing products and re-insert
      if (surveyId) {
        await supabase
          .from('company_products')
          .delete()
          .eq('survey_id', surveyId);

        const productsToInsert = survey.products
          .filter(p => p.product_name.trim())
          .map(p => ({
            survey_id: surveyId,
            product_name: p.product_name,
            product_description: p.product_description,
          }));

        if (productsToInsert.length > 0) {
          const { error: productsError } = await supabase
            .from('company_products')
            .insert(productsToInsert);
          if (productsError) throw productsError;
        }
      }

      setHasSurvey(true);
      return { error: null };
    } catch (error) {
      console.error('Error saving survey:', error);
      return { error: error as Error };
    } finally {
      setIsSaving(false);
    }
  };

  const updateSurvey = (updates: Partial<CompanySurvey>) => {
    setSurvey(prev => ({ ...prev, ...updates }));
  };

  const addProduct = () => {
    setSurvey(prev => ({
      ...prev,
      products: [...prev.products, { product_name: '', product_description: '' }],
    }));
  };

  const removeProduct = (index: number) => {
    setSurvey(prev => ({
      ...prev,
      products: prev.products.filter((_, i) => i !== index),
    }));
  };

  const updateProduct = (index: number, updates: Partial<CompanyProduct>) => {
    setSurvey(prev => ({
      ...prev,
      products: prev.products.map((p, i) => (i === index ? { ...p, ...updates } : p)),
    }));
  };

  return {
    survey,
    isLoading,
    isSaving,
    hasSurvey,
    saveSurvey,
    updateSurvey,
    addProduct,
    removeProduct,
    updateProduct,
    refetch: fetchSurvey,
  };
}
