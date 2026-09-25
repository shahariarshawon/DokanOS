'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Star,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Link as LinkIcon,
  Clipboard,
} from 'lucide-react';
import { uploadImageFile } from '@/lib/api-client';

interface ProductImageManagerProps {
  images: string[];
  primaryImage: string;
  onChange: (images: string[], primaryImage: string) => void;
  maxImages?: number;
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function ProductImageManager({
  images,
  primaryImage,
  onChange,
  maxImages = 8,
}: ProductImageManagerProps) {
  const [urlInput, setUrlInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [replacingIndex, setReplacingIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Clear messages after 4 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  // Process a local File (upload via backend API with fallback)
  const processAndUploadFile = useCallback(
    async (file: File, targetIndex?: number | null) => {
      setError(null);
      setSuccess(null);

      // Validate format
      if (!ALLOWED_MIME_TYPES.includes(file.type)) {
        setError(`Invalid format (${file.type || 'unknown'}). Allowed: JPG, PNG, WEBP.`);
        return;
      }

      // Validate size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(
          `File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds maximum threshold of 5MB.`,
        );
        return;
      }

      setIsUploading(true);
      setUploadProgress(25);

      try {
        setUploadProgress(65);
        const { url } = await uploadImageFile(file);
        setUploadProgress(100);

        if (targetIndex !== undefined && targetIndex !== null && targetIndex >= 0) {
          // Replace specific image
          const nextImages = [...images];
          nextImages[targetIndex] = url;
          const nextPrimary = targetIndex === 0 ? url : primaryImage || url;
          onChange(nextImages, nextPrimary);
          setSuccess('Image replaced successfully.');
        } else {
          // Add as new image
          if (images.length >= maxImages) {
            setError(`Maximum limit of ${maxImages} product images reached.`);
            return;
          }
          const nextImages = [...images, url];
          const nextPrimary = primaryImage || url;
          onChange(nextImages, nextPrimary);
          setSuccess('Image uploaded and added to catalog.');
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Image upload failed. Please try again.');
      } finally {
        setIsUploading(false);
        setUploadProgress(null);
        setReplacingIndex(null);
      }
    },
    [images, primaryImage, onChange, maxImages],
  );

  // Listen for Clipboard Paste (CTRL + V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      // Only process if focus is within our component or document body
      if (
        containerRef.current &&
        (containerRef.current.contains(document.activeElement) ||
          document.activeElement === document.body)
      ) {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith('image/')) {
            const file = items[i].getAsFile();
            if (file) {
              e.preventDefault();
              processAndUploadFile(file, replacingIndex);
              return;
            }
          }
        }

        // If pasted text looks like an image URL
        const text = e.clipboardData?.getData('text');
        if (
          text &&
          (text.startsWith('http://') ||
            text.startsWith('https://') ||
            text.startsWith('data:image/'))
        ) {
          if (document.activeElement !== containerRef.current?.querySelector('input[type="url"]')) {
            // Fill into URL input or test URL directly
            setUrlInput(text.trim());
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [processAndUploadFile, replacingIndex]);

  // Handle URL Addition with broken URL check
  const handleAddUrl = async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) {
      setError('Please provide an image URL.');
      return;
    }

    if (
      !trimmed.startsWith('http://') &&
      !trimmed.startsWith('https://') &&
      !trimmed.startsWith('data:image/')
    ) {
      setError('Image URL must start with https:// or http://.');
      return;
    }

    if (images.length >= maxImages && replacingIndex === null) {
      setError(`Maximum limit of ${maxImages} images reached.`);
      return;
    }

    setIsUploading(true);
    setError(null);

    // Validate if the URL is broken by pre-loading with Image
    const isImageValid = await new Promise<boolean>((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = trimmed;
    });

    setIsUploading(false);

    if (!isImageValid) {
      setError('The image URL could not be loaded or is broken. Please verify the URL.');
      return;
    }

    if (replacingIndex !== null && replacingIndex >= 0) {
      const nextImages = [...images];
      nextImages[replacingIndex] = trimmed;
      const nextPrimary = replacingIndex === 0 ? trimmed : primaryImage || trimmed;
      onChange(nextImages, nextPrimary);
      setSuccess('Image replaced via URL.');
      setReplacingIndex(null);
    } else {
      const nextImages = [...images, trimmed];
      const nextPrimary = primaryImage || trimmed;
      onChange(nextImages, nextPrimary);
      setSuccess('Image URL added successfully.');
    }
    setUrlInput('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (files.length === 1) {
      processAndUploadFile(files[0], replacingIndex);
    } else {
      // Multiple file uploads
      Array.from(files).forEach((file) => {
        processAndUploadFile(file);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSetPrimary = (targetUrl: string) => {
    // Reorder so primary is first
    const reordered = [targetUrl, ...images.filter((img) => img !== targetUrl)];
    onChange(reordered, targetUrl);
    setSuccess('Primary hero image updated.');
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const targetUrl = images[indexToRemove];
    const filtered = images.filter((_, idx) => idx !== indexToRemove);
    let nextPrimary = primaryImage;
    if (targetUrl === primaryImage) {
      nextPrimary = filtered[0] || '';
    }
    onChange(filtered, nextPrimary);
    setSuccess('Image removed.');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach((file) => processAndUploadFile(file));
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
    >
      <div className="flex items-center justify-between pb-2 border-b border-zinc-200">
        <div>
          <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
            <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
            <span>Product Gallery & Image Studio</span>
          </h4>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Upload from PC, paste image URL, or copy an image anywhere and press{' '}
            <kbd className="px-1 py-0.5 bg-white border border-zinc-300 rounded font-mono text-[9px] text-zinc-700">
              Ctrl + V
            </kbd>
          </p>
        </div>
        <span className="text-[11px] font-mono font-semibold text-zinc-600 bg-white border border-zinc-200 px-2 py-0.5 rounded-full">
          {images.length} / {maxImages} Images
        </span>
      </div>

      {/* Alerts */}
      {error && (
        <div
          id="image-manager-error"
          className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 animate-fade-in"
        >
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div
          id="image-manager-success"
          className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2 animate-fade-in"
        >
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* Upload Drag & Drop Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/50'
            : 'border-zinc-300 bg-white hover:border-zinc-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleFileChange}
          className="hidden"
          id="product-file-upload-input"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-900">
              {isUploading ? 'Uploading image...' : 'Drop image files here, or browse local PC'}
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              Supports JPG, PNG, WEBP up to 5MB • Clipboard pasting (Ctrl + V) active
            </p>
          </div>

          {uploadProgress !== null && (
            <div className="w-48 bg-zinc-100 rounded-full h-1.5 overflow-hidden mt-2">
              <div
                className="bg-indigo-600 h-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => {
                setReplacingIndex(null);
                fileInputRef.current?.click();
              }}
              className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-medium text-xs transition-colors shadow-2xs flex items-center gap-1.5"
            >
              <Upload className="w-3 h-3" />
              <span>Choose Files</span>
            </button>
            <span className="text-[11px] text-zinc-400">or</span>
            <span className="text-[11px] text-indigo-600 font-medium inline-flex items-center gap-1">
              <Clipboard className="w-3 h-3" /> Paste clipboard
            </span>
          </div>
        </div>
      </div>

      {/* Paste URL Input Option */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-zinc-400">
            <LinkIcon className="w-3.5 h-3.5" />
          </div>
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder={
              replacingIndex !== null
                ? `Paste replacement URL for image #${replacingIndex + 1}...`
                : 'Paste image URL (https://cdn.example.com/item.jpg)...'
            }
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-zinc-200 bg-white text-xs text-zinc-900 placeholder-zinc-400 outline-none focus:border-indigo-600"
          />
        </div>
        <button
          type="button"
          disabled={isUploading || !urlInput.trim()}
          onClick={handleAddUrl}
          className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-semibold text-xs transition-colors shrink-0 disabled:opacity-50 flex items-center gap-1"
        >
          {replacingIndex !== null ? (
            <>
              <RefreshCw className="w-3 h-3" />
              <span>Replace URL</span>
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" />
              <span>Add URL</span>
            </>
          )}
        </button>
        {replacingIndex !== null && (
          <button
            type="button"
            onClick={() => setReplacingIndex(null)}
            className="px-2 py-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-zinc-800 text-xs"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Image Gallery Grid & Actions */}
      <div>
        <label className="text-[11px] font-semibold text-zinc-700 block mb-2">
          Current Gallery Images ({images.length})
        </label>

        {images.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-6 text-center text-xs text-zinc-400">
            No product images uploaded yet. Upload or paste one above.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {images.map((imgUrl, index) => {
              const isPrimary = imgUrl === primaryImage || (index === 0 && !primaryImage);
              const isBeingReplaced = replacingIndex === index;

              return (
                <div
                  key={`${imgUrl}-${index}`}
                  className={`group relative rounded-xl border overflow-hidden bg-white shadow-2xs transition-all ${
                    isPrimary
                      ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                      : isBeingReplaced
                        ? 'border-amber-500 ring-2 ring-amber-500/20'
                        : 'border-zinc-200 hover:border-zinc-300'
                  }`}
                >
                  {/* Thumbnail */}
                  <div className="aspect-square w-full bg-zinc-100 overflow-hidden relative">
                    <img
                      src={imgUrl}
                      alt={`Product preview ${index + 1}`}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-200"
                    />

                    {/* Primary Badge */}
                    {isPrimary && (
                      <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                        <Star className="w-2.5 h-2.5 fill-white" />
                        Hero Image
                      </span>
                    )}

                    {isBeingReplaced && (
                      <span className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 rounded bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-xs">
                        Ready to Replace
                      </span>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="p-2 bg-white flex items-center justify-between gap-1 border-t border-zinc-100">
                    {!isPrimary ? (
                      <button
                        type="button"
                        onClick={() => handleSetPrimary(imgUrl)}
                        className="text-[10px] font-medium text-zinc-600 hover:text-indigo-600 transition-colors flex items-center gap-0.5"
                        title="Set as Hero Thumbnail"
                      >
                        <Star className="w-3 h-3" />
                        <span>Hero</span>
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-indigo-600">Primary</span>
                    )}

                    <div className="flex items-center gap-1">
                      {/* Replace Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setReplacingIndex(index);
                          fileInputRef.current?.click();
                        }}
                        className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
                        title="Replace this image"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="p-1 rounded hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition-colors"
                        title="Delete image"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
