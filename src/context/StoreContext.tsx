"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

export interface CartItem {
  id: string;
  title: string;
  price: number;
  image: string;
  quantity: number;
  size?: string;
  color?: string;
  collection?: string;
  variantImages?: string[];
}

export interface WishlistItem {
  id: string;
  title: string;
  price: number;
  image: string;
  collection?: string;
}

interface StoreContextType {
  cart: CartItem[];
  wishlist: WishlistItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (id: string, size?: string, color?: string) => void;
  updateQuantity: (id: string, qty: number, size?: string, color?: string) => void;
  toggleWishlist: (item: WishlistItem) => void;
  isInWishlist: (id: string) => boolean;
  cartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  clearCart: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [isCartOpen, setCartOpen] = useState(false);

  // Load from local storage on client mount
  useEffect(() => {
    const savedCart = localStorage.getItem("aura_cart");
    const savedWishlist = localStorage.getItem("aura_wishlist");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedCart) setCart(JSON.parse(savedCart));
    if (savedWishlist) setWishlist(JSON.parse(savedWishlist));
  }, []);

  const saveCart = useCallback((newCart: CartItem[]) => {
    setCart(newCart);
    localStorage.setItem("aura_cart", JSON.stringify(newCart));
  }, []);

  const clearCart = useCallback(() => {
    saveCart([]);
  }, [saveCart]);

  const addToCart = useCallback((item: Omit<CartItem, "quantity">) => {
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (i) => i.id === item.id && i.size === item.size && i.color === item.color
      );
      let newCart;
      if (existingIndex > -1) {
        newCart = [...prevCart];
        newCart[existingIndex].quantity += 1;
      } else {
        newCart = [...prevCart, { ...item, quantity: 1 }];
      }
      localStorage.setItem("aura_cart", JSON.stringify(newCart));
      return newCart;
    });
    setCartOpen(true);
  }, []);

  const removeFromCart = useCallback((id: string, size?: string, color?: string) => {
    setCart((prevCart) => {
      const newCart = prevCart.filter((i) => !(i.id === id && i.size === size && i.color === color));
      localStorage.setItem("aura_cart", JSON.stringify(newCart));
      return newCart;
    });
  }, []);

  const updateQuantity = useCallback((id: string, qty: number, size?: string, color?: string) => {
    if (qty <= 0) {
      removeFromCart(id, size, color);
      return;
    }
    setCart((prevCart) => {
      const newCart = prevCart.map((i) =>
        i.id === id && i.size === size && i.color === color ? { ...i, quantity: qty } : i
      );
      localStorage.setItem("aura_cart", JSON.stringify(newCart));
      return newCart;
    });
  }, [removeFromCart]);

  const toggleWishlist = useCallback((item: WishlistItem) => {
    setWishlist((prev) => {
      const exists = prev.some((i) => i.id === item.id);
      let newWishlist;
      if (exists) {
        newWishlist = prev.filter((i) => i.id !== item.id);
      } else {
        newWishlist = [...prev, item];
      }
      localStorage.setItem("aura_wishlist", JSON.stringify(newWishlist));
      return newWishlist;
    });
  }, []);

  const isInWishlist = useCallback((id: string) => {
    return wishlist.some((i) => i.id === id);
  }, [wishlist]);

  const cartCount = useMemo(() => cart.reduce((total, item) => total + item.quantity, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((total, item) => total + item.price * item.quantity, 0), [cart]);

  const contextValue = useMemo(() => ({
    cart,
    wishlist,
    addToCart,
    removeFromCart,
    updateQuantity,
    toggleWishlist,
    isInWishlist,
    cartCount,
    cartSubtotal,
    isCartOpen,
    setCartOpen,
    clearCart,
  }), [cart, wishlist, addToCart, removeFromCart, updateQuantity, toggleWishlist, isInWishlist, cartCount, cartSubtotal, isCartOpen, clearCart]);

  return (
    <StoreContext.Provider value={contextValue}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error("useStore must be used within a StoreProvider");
  }
  return context;
}
