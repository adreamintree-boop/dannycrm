import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';

export interface CompanyProduct {
  id?: string;
  product_name: string;
  product_description: string;
}

export interface SurveyFile {
  id?: string;
  name: string;
  size: number;
  storagePath?: string;
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
  // File references
  catalogFile: SurveyFile | null;
  introFile: SurveyFile | null;
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
  catalogFile: null,
  introFile: null,
};

export function useCompanySurvey() {
  const { user } = useAuthContext();
  const [survey, setSurvey] = useState<CompanySurvey>(defaultSurvey);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasSurvey, setHasSurvey] = useState(false);
  const [uploadingCatalog, setUploadingCatalog] = useState(false);
  const [uploadingIntro, setUploadingIntro] = useState(false);
  const [catalogProgress, setCatalogProgress] = useState(0);
  const [introProgress, setIntroProgress] = useState(0);

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

        // Fetch file metadata
        const { data: filesData } = await supabase
          .from('survey_files')
          .select('*')
          .eq('survey_id', surveyData.id);

        const catalogFileData = filesData?.find(f => f.file_type === 'product_catalog');
        const introFileData = filesData?.find(f => f.file_type === 'company_introduction');

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
          catalogFile: catalogFileData ? {
            id: catalogFileData.id,
            name: catalogFileData.original_file_name,
            size: catalogFileData.file_size,
            storagePath: catalogFileData.storage_path,
          } : null,
          introFile: introFileData ? {
            id: introFileData.id,
            name: introFileData.original_file_name,
            size: introFileData.file_size,
            storagePath: introFileData.storage_path,
          } : null,
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

  const uploadFile = async (
    file: File,
    fileType: 'product_catalog' | 'company_introduction',
    setUploading: React.Dispatch<React.SetStateAction<boolean>>,
    setProgress: React.Dispatch<React.SetStateAction<number>>
  ): Promise<SurveyFile | null> => {
    if (!user) return null;

    setUploading(true);
    setProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const storagePath = `${user.id}/${fileType}/${fileName}`;

      // Simulate progress (Supabase doesn't support progress events)
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress = Math.min(progress + 10, 90);
        setProgress(progress);
      }, 200);

      const { error: uploadError } = await supabase.storage
        .from('survey-files')
        .upload(storagePath, file);

      clearInterval(progressInterval);

      if (uploadError) throw uploadError;

      setProgress(100);

      return {
        name: file.name,
        size: file.size,
        storagePath,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadCatalogFile = async (file: File) => {
    const result = await uploadFile(file, 'product_catalog', setUploadingCatalog, setCatalogProgress);
    if (result) {
      setSurvey(prev => ({ ...prev, catalogFile: result }));
    }
  };

  const uploadIntroFile = async (file: File) => {
    const result = await uploadFile(file, 'company_introduction', setUploadingIntro, setIntroProgress);
    if (result) {
      setSurvey(prev => ({ ...prev, introFile: result }));
    }
  };

  const removeFile = async (fileType: 'product_catalog' | 'company_introduction') => {
    const fileToRemove = fileType === 'product_catalog' ? survey.catalogFile : survey.introFile;
    
    if (fileToRemove?.storagePath) {
      await supabase.storage.from('survey-files').remove([fileToRemove.storagePath]);
    }

    if (fileType === 'product_catalog') {
      setSurvey(prev => ({ ...prev, catalogFile: null }));
    } else {
      setSurvey(prev => ({ ...prev, introFile: null }));
    }
  };

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

        // Handle file metadata
        // Delete existing file records
        await supabase
          .from('survey_files')
          .delete()
          .eq('survey_id', surveyId);

        // Insert new file records
        const filesToInsert = [];

        if (survey.catalogFile?.storagePath) {
          filesToInsert.push({
            user_id: user.id,
            survey_id: surveyId,
            file_type: 'product_catalog',
            original_file_name: survey.catalogFile.name,
            file_size: survey.catalogFile.size,
            mime_type: getMimeType(survey.catalogFile.name),
            storage_path: survey.catalogFile.storagePath,
          });
        }

        if (survey.introFile?.storagePath) {
          filesToInsert.push({
            user_id: user.id,
            survey_id: surveyId,
            file_type: 'company_introduction',
            original_file_name: survey.introFile.name,
            file_size: survey.introFile.size,
            mime_type: getMimeType(survey.introFile.name),
            storage_path: survey.introFile.storagePath,
          });
        }

        if (filesToInsert.length > 0) {
          const { error: filesError } = await supabase
            .from('survey_files')
            .insert(filesToInsert);
          if (filesError) throw filesError;
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
    // File upload
    uploadCatalogFile,
    uploadIntroFile,
    removeFile,
    uploadingCatalog,
    uploadingIntro,
    catalogProgress,
    introProgress,
  };
}

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'ppt': return 'application/vnd.ms-powerpoint';
    case 'pptx': return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    default: return 'application/octet-stream';
  }
}
