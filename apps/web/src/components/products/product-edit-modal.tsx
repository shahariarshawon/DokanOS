'use client';

import React, { useState } from 'react';
import {
  X,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Package,
  DollarSign,
  Tag,
  Barcode,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Product } from '@/lib/mock-data';
import { updateProduct } from '@/lib/api-client';
import { ProductImageManager } from './product-image-manager';
import { formatPrice } from '@/lib/utils';

interface ProductEditModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: (updated: Product) => void;
}

export function ProductEditModal({ product, isOpen, onClose, onSaved }: ProductEditModalProps) {
  if (!isOpen || !product) return null;

  const [title, setTitle] = useState(product.title);
  const [sku, setSku] = useState(product.sku || '');
  const [price, setPrice] = useState(product.price);
  const [compareAtPrice, setCompareAtPrice] = useState(product.compareAtPrice || 0);
  const [stock, setStock] = useState(product.stock);
  const [lowStockThreshold, setLowStockThreshold] = useState(product.lowStockThreshold || 5);
  const [category, setCategory] = useState(product.category || 'Smartphones & Tech');
  const [description, setDescription] = useState(product.description || '');

  // Images state
  const initialImages =
    product.images && product.images.length > 0
      ? product.images
      : product.primaryImage
        ? [product.primaryImage]
        : [];
  const [images, setImages] = useState<string[]>(initialImages);
  const [primaryImage, setPrimaryImage] = useState<string>(
    product.primaryImage || initialImages[0] || '',
  );

  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleImagesChange = (newImages: string[], newPrimary: string) => {
    setImages(newImages);
    setPrimaryImage(newPrimary);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError('Product title is required.');
      return;
    }

    if (price <= 0) {
      setError('Price must be greater than 0.');
      return;
    }

    if (images.length === 0) {
      setError('At least one product image is required.');
      return;
    }

    setIsSaving(true);

    try {
      const resolvedPrimary = primaryImage || images[0];
      const updated = await updateProduct(product.id, {
        title: title.trim(),
        sku: sku.trim(),
        price: Number(price),
        compareAtPrice: compareAtPrice > 0 ? Number(compareAtPrice) : undefined,
        stock: Number(stock),
        lowStockThreshold: Number(lowStockThreshold),
        category,
        categorySlug: category.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description,
        primaryImage: resolvedPrimary,
        images,
      });

      onSaved(updated);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update product');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      id="product-edit-modal"
      data-testid="product-edit-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white shadow-2xl animate-fade-in my-8 max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 bg-zinc-50/60">
          <div>
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              <span>Edit Product & Gallery</span>
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Modify product details, SKU specifications, and manage high-resolution catalog photos.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Product Images Studio */}
          <div>
            <ProductImageManager
              images={images}
              primaryImage={primaryImage}
              onChange={handleImagesChange}
              maxImages={8}
            />
          </div>

          {/* Section 2: Core Details */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-wider">
              General Information
            </h4>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">Product Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Product title..."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600 font-medium"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                >
                  <option value="Smartphones & Tech">Smartphones & Tech</option>
                  <option value="Audio & Acoustics">Audio & Acoustics</option>
                  <option value="Computer Peripherals">Computer Peripherals</option>
                  <option value="Footwear & Apparel">Footwear & Apparel</option>
                  <option value="Home & Ergonomics">Home & Ergonomics</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">SKU Code</label>
                <input
                  type="text"
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="e.g. PRD-1029-BLK"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Price ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600 font-bold"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Compare At ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={compareAtPrice}
                  onChange={(e) => setCompareAtPrice(parseFloat(e.target.value) || 0)}
                  placeholder="Optional regular price"
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Stock Units</label>
                <input
                  type="number"
                  min="0"
                  value={stock}
                  onChange={(e) => setStock(parseInt(e.target.value) || 0)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                />
              </div>

              <div>
                <label className="font-semibold text-zinc-700 block mb-1">Low Alert At</label>
                <input
                  type="number"
                  min="1"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 5)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">Description</label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Product description and specifications..."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-zinc-900 outline-none focus:border-indigo-600 leading-relaxed"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-3 sticky bottom-0 bg-white py-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Product</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
