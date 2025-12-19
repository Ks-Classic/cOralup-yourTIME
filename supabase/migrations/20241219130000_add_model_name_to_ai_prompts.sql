-- Add model_name column to ai_prompts table for dynamic model selection
ALTER TABLE public.ai_prompts 
ADD COLUMN IF NOT EXISTS model_name TEXT DEFAULT 'gemini-2.5-flash-lite';

-- Add comment for documentation
COMMENT ON COLUMN public.ai_prompts.model_name IS 'Gemini model name to use for this prompt configuration';
