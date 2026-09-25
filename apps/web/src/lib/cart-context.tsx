'use client';

import React, { createContext, useContext, useState } from 'react';
import { Product, ProductVariant, CartItem, MOCK_PRODUCTS } from './mock-data';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, variant?: ProductVariant) => void;
  updateQuantity: (itemIdOrProductId: string, quantity: number) => void;
  removeFromCart: (itemIdOrProductId: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('dokanos_cart');
        if (stored) {
          return JSON.parse(stored);
        }
      } catch {
        // ignore
      }
    }
    const defaultProd = MOCK_PRODUCTS[0];
    const defaultVariant = defaultProd.variants[0];
    return [
      {
        id: `${defaultProd.id}-${defaultVariant?.id ?? 'base'}`,
        productId: defaultProd.id,
        product: defaultProd,
        variantId: defaultVariant?.id,
        variant: defaultVariant,
        quantity: 1,
        unitPrice: defaultVariant?.price ?? defaultProd.price,
      },
    ];
  });

  const saveItems = (newItems: CartItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem('dokanos_cart', JSON.stringify(newItems));
    } catch {
      // ignore
    }
  };

  const addToCart = (product: Product, quantity: number = 1, variant?: ProductVariant) => {
    const activeVariant =
      variant ||
      (product.variants && product.variants.length > 0 ? product.variants[0] : undefined);
    const cartItemId = activeVariant ? `${product.id}-${activeVariant.id}` : product.id;

    const existingIndex = items.findIndex((i) => i.id === cartItemId);
    const unitPrice = activeVariant ? activeVariant.price : product.price;

    let updated: CartItem[];
    if (existingIndex > -1) {
      updated = [...items];
      updated[existingIndex].quantity += quantity;
    } else {
      updated = [
        ...items,
        {
          id: cartItemId,
          productId: product.id,
          product,
          variantId: activeVariant?.id,
          variant: activeVariant,
          quantity,
          unitPrice,
        },
      ];
    }
    saveItems(updated);
  };

  const updateQuantity = (itemIdOrProductId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemIdOrProductId);
      return;
    }
    const updated = items.map((i) =>
      i.id === itemIdOrProductId || i.productId === itemIdOrProductId ? { ...i, quantity } : i,
    );
    saveItems(updated);
  };

  const removeFromCart = (itemIdOrProductId: string) => {
    const updated = items.filter(
      (i) => i.id !== itemIdOrProductId && i.productId !== itemIdOrProductId,
    );
    saveItems(updated);
  };

  const clearCart = () => {
    saveItems([]);
  };

  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  const subtotal = items.reduce((total, item) => total + item.unitPrice * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        itemCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
