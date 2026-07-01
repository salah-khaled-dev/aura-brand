"use client";

import React, { useEffect } from 'react';
import { IconX } from '@tabler/icons-react';
import { adminAr } from '@/lib/i18n/admin-ar';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'max';
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | 'max';
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth, size }: ModalProps) {
  const resolvedMaxWidth = maxWidth ?? size ?? 'md';
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen, onClose]);

  const maxWidthClasses = {
    'sm': 'max-w-sm',
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    'max': 'max-w-[90vw]'
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute inset-0 bg-[#0B1220]/60 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.3, type: 'spring', bounce: 0.2 }}
            className={`relative w-full ${maxWidthClasses[resolvedMaxWidth]} max-h-[90vh] flex flex-col bg-[var(--admin-bg-surface)] rounded-[var(--admin-radius-2xl)] shadow-[var(--admin-shadow-float)] border border-[var(--admin-border-light)] overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-center justify-between p-6 border-b border-[var(--admin-border-base)] bg-[var(--admin-bg-card)]">
              <h2 className="text-xl font-semibold text-[var(--admin-text-base)] tracking-tight">{title}</h2>
              <button 
                onClick={onClose}
                className="p-2 text-[var(--admin-text-muted)] hover:text-[var(--admin-text-base)] hover:bg-[var(--admin-bg-hover)] rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)] focus:ring-offset-2"
                aria-label={adminAr.common?.close || 'Close'}
              >
                <IconX size={20} stroke={2.5} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar bg-[var(--admin-bg-base)]">
              {children}
            </div>
            {footer && (
              <div className="p-4 border-t border-[var(--admin-border-base)] bg-[var(--admin-bg-surface)] shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
