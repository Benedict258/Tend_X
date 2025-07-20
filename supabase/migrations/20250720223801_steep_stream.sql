/*
  # Fix User Profile Issues

  1. Database Functions
    - Create function to handle new user registration
    - Ensure user records are created automatically

  2. Triggers
    - Add trigger to create user record on auth signup
    - Handle existing users without profiles

  3. Data Consistency
    - Create missing user records for existing auth users
    - Ensure all auth users have corresponding user records

  4. Security
    - Maintain existing RLS policies
    - Ensure proper access controls
*/

-- Create or replace the function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    user_id,
    email,
    full_name,
    role,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'user_id', 'USER-' || SUBSTRING(NEW.id::text, 1, 8)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'::user_role),
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create missing user records for existing auth users
INSERT INTO public.users (
  id,
  user_id,
  email,
  full_name,
  role,
  created_at,
  updated_at
)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'user_id', 'USER-' || SUBSTRING(au.id::text, 1, 8)),
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', SPLIT_PART(au.email, '@', 1)),
  COALESCE((au.raw_user_meta_data->>'role')::user_role, 'user'::user_role),
  au.created_at,
  au.updated_at
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE pu.id IS NULL
  AND au.email IS NOT NULL;

-- Update any users with missing user_id
UPDATE public.users 
SET user_id = 'USER-' || SUBSTRING(id::text, 1, 8)
WHERE user_id IS NULL OR user_id = '';

-- Ensure all users have a full_name
UPDATE public.users 
SET full_name = SPLIT_PART(email, '@', 1)
WHERE full_name IS NULL OR full_name = '';