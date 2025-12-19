-- Add variable_config column to ai_prompts table
ALTER TABLE public.ai_prompts ADD COLUMN IF NOT EXISTS variable_config JSONB DEFAULT '[]'::jsonb;
