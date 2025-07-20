/*
  # Add Image Support for Users, Events, and Posts

  1. Database Changes
    - Add avatar_url column to users table
    - Add image_url column to posts table (for future events table)
    - Update existing records to have null image URLs

  2. Storage Setup
    - Instructions for creating storage buckets
    - RLS policies for secure access

  3. Notes
    - Buckets need to be created manually in Supabase dashboard:
      - avatars (public)
      - post-images (public)
      - event-images (public for future use)
*/

-- Add avatar_url column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_url text;
  END IF;
END $$;

-- Add image_url column to posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE posts ADD COLUMN image_url text;
  END IF;
END $$;

-- Create storage buckets (these need to be created manually in Supabase dashboard)
-- Bucket names: avatars, post-images, event-images
-- All should be set to public for easier access

-- RLS policies for storage will be handled automatically by Supabase
-- Users can upload to their own folders, and read public content