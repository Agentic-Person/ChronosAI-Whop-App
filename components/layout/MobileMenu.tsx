'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Sidebar, SidebarProps } from './Sidebar';
import { cn } from '@/lib/utils';

export interface MobileMenuProps extends Omit<SidebarProps, 'collapsed' | 'onToggleCollapse'> {
  open: boolean;
  onClose: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ open, onClose, ...sidebarProps }) => {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 z-40 lg:hidden"
            onClick={onClose}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed left-0 top-0 bottom-0 z-50 w-[280px] lg:hidden"
          >
            <div className="sidebar h-full">
              <Sidebar {...sidebarProps} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
