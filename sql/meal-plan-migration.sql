-- Migration: Add person and leftover support to meal_plan

-- Add columns to meal_plan table
ALTER TABLE public.meal_plan
ADD COLUMN IF NOT EXISTS person TEXT,
ADD COLUMN IF NOT EXISTS extra_servings NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS leftover_name TEXT;

-- Create index for faster queries by user_id, date, person
CREATE INDEX IF NOT EXISTS idx_meal_plan_user_date_person 
ON public.meal_plan(user_id, date, person);

-- Update existing rows to have a default person (optional - you can leave NULL for old data)
-- UPDATE public.meal_plan SET person = 'Emma' WHERE person IS NULL;
