import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  onImageRemove?: () => void;
  currentImageUrl?: string;
  isUploading?: boolean;
  uploadProgress?: number;
  error?: string;
  className?: string;
  variant?: 'avatar' | 'banner' | 'post';
  disabled?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelect,
  onImageRemove,
  currentImageUrl,
  isUploading = false,
  uploadProgress = 0,
  error,
  className,
  variant = 'post',
  disabled = false
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File) => {
    if (disabled || isUploading) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    onImageSelect(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleRemove = () => {
    setPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onImageRemove?.();
  };

  const displayImage = preview || currentImageUrl;

  const getVariantStyles = () => {
    switch (variant) {
      case 'avatar':
        return 'w-24 h-24 rounded-full';
      case 'banner':
        return 'w-full h-32 rounded-lg';
      case 'post':
      default:
        return 'w-full h-48 rounded-lg';
    }
  };

  return (
    <div className={cn('space-y-4', className)}>
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label>Image Upload</Label>
        
        {displayImage ? (
          <div className="relative">
            <div className={cn('overflow-hidden border-2 border-dashed border-muted', getVariantStyles())}>
              <img
                src={displayImage}
                alt="Upload preview"
                className="w-full h-full object-cover"
              />
            </div>
            
            {!disabled && !isUploading && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={handleRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
            
            {isUploading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                <div className="text-white text-center space-y-2">
                  <div className="text-sm">Uploading...</div>
                  <Progress value={uploadProgress} className="w-24" />
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className={cn(
              'border-2 border-dashed border-muted-foreground/25 transition-colors',
              'flex flex-col items-center justify-center space-y-2 cursor-pointer',
              'hover:border-muted-foreground/50',
              dragOver && 'border-primary bg-primary/5',
              disabled && 'opacity-50 cursor-not-allowed',
              getVariantStyles()
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            {variant === 'avatar' ? (
              <Camera className="h-8 w-8 text-muted-foreground" />
            ) : (
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
            )}
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                {variant === 'avatar' ? 'Upload avatar' : 'Drop image here or click to browse'}
              </p>
              <p className="text-xs text-muted-foreground">
                PNG, JPG, GIF up to 5MB
              </p>
            </div>
          </div>
        )}

        <Input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || isUploading}
        />

        {!displayImage && (
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            Choose Image
          </Button>
        )}
      </div>
    </div>
  );
};