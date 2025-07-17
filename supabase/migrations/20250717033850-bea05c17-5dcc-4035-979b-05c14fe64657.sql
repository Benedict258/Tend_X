-- Fix the RLS policy for user creation
-- The current policy prevents the trigger from inserting new users
-- because auth.uid() is null during the trigger execution

DROP POLICY IF EXISTS "Allow individual user access" ON public.users;

-- Create separate policies for different operations
CREATE POLICY "Users can view their own data" 
ON public.users 
FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" 
ON public.users 
FOR UPDATE 
USING (auth.uid() = id);

-- Allow inserts during user creation (this will be used by the trigger)
CREATE POLICY "Allow user creation during signup" 
ON public.users 
FOR INSERT 
WITH CHECK (true);

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id, 
    user_id, 
    email, 
    full_name, 
    role,
    institution,
    occupation,
    bio
  ) VALUES (
    NEW.id,
    generate_user_id(),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'user'),
    COALESCE(NEW.raw_user_meta_data->>'institution', ''),
    COALESCE(NEW.raw_user_meta_data->>'occupation', ''),
    COALESCE(NEW.raw_user_meta_data->>'bio', '')
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE NOTICE 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;