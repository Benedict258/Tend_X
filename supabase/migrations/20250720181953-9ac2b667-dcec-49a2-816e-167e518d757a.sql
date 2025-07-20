-- Add phone number field to users table
ALTER TABLE public.users 
ADD COLUMN phone_number TEXT;

-- Add profile picture URL field (if not already exists)
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS profile_picture TEXT;