import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface UploadResult {
  url: string;
  path: string;
}

export interface UploadOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
  upsert?: boolean;
}

const DEFAULT_OPTIONS: UploadOptions = {
  maxSizeBytes: 5 * 1024 * 1024, // 5MB
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  upsert: true
};

/**
 * Validates an image file before upload
 */
export const validateImageFile = (file: File, options: UploadOptions = {}): string | null => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Check file size
  if (file.size > opts.maxSizeBytes!) {
    return `File size must be less than ${Math.round(opts.maxSizeBytes! / 1024 / 1024)}MB`;
  }

  // Check file type
  if (!opts.allowedTypes!.includes(file.type)) {
    return 'Please select a valid image file (JPEG, PNG, GIF, or WebP)';
  }

  return null;
};

/**
 * Generic image upload function
 */
export const uploadImage = async (
  bucket: string,
  path: string,
  file: File,
  options: UploadOptions = {}
): Promise<UploadResult> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Validate file
  const validationError = validateImageFile(file, opts);
  if (validationError) {
    throw new Error(validationError);
  }

  try {
    // Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: opts.upsert
      });

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return {
      url: publicUrl,
      path: path
    };
  } catch (error: any) {
    console.error('Image upload error:', error);
    throw new Error(error.message || 'Failed to upload image');
  }
};

/**
 * Upload user avatar
 */
export const uploadAvatar = async (userId: string, file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop() || 'png';
  const path = `${userId}.${fileExt}`;
  
  const result = await uploadImage('avatars', path, file);
  
  // Update user profile with new avatar URL
  const { error } = await supabase
    .from('users')
    .update({ avatar_url: result.url })
    .eq('id', userId);

  if (error) {
    throw new Error('Failed to update profile with new avatar');
  }

  return result.url;
};

/**
 * Upload post image
 */
export const uploadPostImage = async (postId: string, file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `${Date.now()}.${fileExt}`;
  const path = `${postId}/${fileName}`;
  
  const result = await uploadImage('post-images', path, file);
  return result.url;
};

/**
 * Upload event image (for future use)
 */
export const uploadEventImage = async (eventId: string, file: File): Promise<string> => {
  const fileExt = file.name.split('.').pop() || 'png';
  const fileName = `${Date.now()}.${fileExt}`;
  const path = `${eventId}/${fileName}`;
  
  const result = await uploadImage('event-images', path, file);
  return result.url;
};

/**
 * Delete image from storage
 */
export const deleteImage = async (bucket: string, path: string): Promise<void> => {
  const { error } = await supabase.storage
    .from(bucket)
    .remove([path]);

  if (error) {
    console.error('Error deleting image:', error);
    throw new Error('Failed to delete image');
  }
};

/**
 * Get optimized image URL with transformations
 */
export const getOptimizedImageUrl = (
  url: string, 
  options: { width?: number; height?: number; quality?: number } = {}
): string => {
  if (!url) return url;
  
  // For Supabase storage, you can add transformation parameters
  // This is a basic implementation - adjust based on your needs
  const params = new URLSearchParams();
  
  if (options.width) params.append('width', options.width.toString());
  if (options.height) params.append('height', options.height.toString());
  if (options.quality) params.append('quality', options.quality.toString());
  
  const queryString = params.toString();
  return queryString ? `${url}?${queryString}` : url;
};