/**
 * CartContext — compatibility shim.
 *
 * ProductCard.tsx imports { useCart } from '@/context/CartContext'.
 * The actual implementation lives in @/hooks/useCart which itself
 * wraps @/store/cart (Zustand). This file is a pure re-export so
 * that existing imports resolve without modifying ProductCard.tsx.
 *
 * Do NOT add any logic here. Keep this file as a one-liner re-export.
 */
export { useCart } from '@/hooks/useCart';
