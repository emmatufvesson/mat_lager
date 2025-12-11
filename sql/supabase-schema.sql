-- Supabase Schema for MatLager App
-- Run this in Supabase SQL Editor to set up the database

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inventory items
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  quantity NUMERIC NOT NULL,
  unit TEXT,
  category TEXT,
  expiry_date DATE,
  price_info NUMERIC,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  source TEXT NOT NULL
);

-- Consumption logs
CREATE TABLE IF NOT EXISTS public.consumption_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  item_name TEXT NOT NULL,
  quantity_used NUMERIC NOT NULL,
  unit TEXT,
  cost NUMERIC,
  reason TEXT NOT NULL,
  dish_name TEXT,
  notes TEXT
);

-- Cooking sessions
CREATE TABLE IF NOT EXISTS public.cooking_sessions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  dish_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  total_cost NUMERIC,
  notes TEXT
);

-- Cooking session items
CREATE TABLE IF NOT EXISTS public.cooking_session_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  session_id UUID REFERENCES public.cooking_sessions(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  quantity_used NUMERIC NOT NULL,
  unit TEXT,
  cost NUMERIC
);

-- Recipes
CREATE TABLE IF NOT EXISTS public.recipes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  instructions TEXT[],
  cook_time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recipe ingredients
CREATE TABLE IF NOT EXISTS public.recipe_ingredients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE CASCADE NOT NULL,
  ingredient_name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT
);

-- Meal plan
CREATE TABLE IF NOT EXISTS public.meal_plan (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL,
  recipe_id UUID REFERENCES public.recipes(id) ON DELETE SET NULL,
  custom_dish TEXT,
  notes TEXT
);

-- Shopping list
CREATE TABLE IF NOT EXISTS public.shopping_list (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopping list items
CREATE TABLE IF NOT EXISTS public.shopping_list_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  list_id UUID REFERENCES public.shopping_list(id) ON DELETE CASCADE NOT NULL,
  item_name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT,
  estimated_cost NUMERIC,
  purchased BOOLEAN DEFAULT FALSE
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consumption_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooking_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cooking_session_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

-- Policies for profiles (users can only access their own profile)
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Policies for inventory_items
CREATE POLICY "Users can view own inventory" ON public.inventory_items FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own inventory" ON public.inventory_items FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own inventory" ON public.inventory_items FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own inventory" ON public.inventory_items FOR DELETE USING (auth.uid() = user_id);

-- Policies for consumption_logs
CREATE POLICY "Users can view own logs" ON public.consumption_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own logs" ON public.consumption_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own logs" ON public.consumption_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own logs" ON public.consumption_logs FOR DELETE USING (auth.uid() = user_id);

-- Policies for cooking_sessions
CREATE POLICY "Users can view own sessions" ON public.cooking_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own sessions" ON public.cooking_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own sessions" ON public.cooking_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own sessions" ON public.cooking_sessions FOR DELETE USING (auth.uid() = user_id);

-- Policies for cooking_session_items (inherits from session)
CREATE POLICY "Users can view own session items" ON public.cooking_session_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.cooking_sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own session items" ON public.cooking_session_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.cooking_sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update own session items" ON public.cooking_session_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.cooking_sessions WHERE id = session_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own session items" ON public.cooking_session_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.cooking_sessions WHERE id = session_id AND user_id = auth.uid())
);

-- Policies for recipes
CREATE POLICY "Users can view own recipes" ON public.recipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own recipes" ON public.recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recipes" ON public.recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recipes" ON public.recipes FOR DELETE USING (auth.uid() = user_id);

-- Policies for recipe_ingredients (inherits from recipe)
CREATE POLICY "Users can view own recipe ingredients" ON public.recipe_ingredients FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own recipe ingredients" ON public.recipe_ingredients FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update own recipe ingredients" ON public.recipe_ingredients FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own recipe ingredients" ON public.recipe_ingredients FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.recipes WHERE id = recipe_id AND user_id = auth.uid())
);

-- Policies for meal_plan
CREATE POLICY "Users can view own meal plan" ON public.meal_plan FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meal plan" ON public.meal_plan FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal plan" ON public.meal_plan FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal plan" ON public.meal_plan FOR DELETE USING (auth.uid() = user_id);

-- Policies for shopping_list
CREATE POLICY "Users can view own shopping lists" ON public.shopping_list FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own shopping lists" ON public.shopping_list FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own shopping lists" ON public.shopping_list FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own shopping lists" ON public.shopping_list FOR DELETE USING (auth.uid() = user_id);

-- Policies for shopping_list_items (inherits from list)
CREATE POLICY "Users can view own shopping list items" ON public.shopping_list_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.shopping_list WHERE id = list_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own shopping list items" ON public.shopping_list_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.shopping_list WHERE id = list_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update own shopping list items" ON public.shopping_list_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.shopping_list WHERE id = list_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own shopping list items" ON public.shopping_list_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.shopping_list WHERE id = list_id AND user_id = auth.uid())
);

-- Function to handle new user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();