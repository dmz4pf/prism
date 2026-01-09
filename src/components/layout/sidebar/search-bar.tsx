'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <motion.div
        animate={{
          backgroundColor: isFocused
            ? 'rgba(59, 130, 246, 0.1)'
            : 'rgba(30, 30, 45, 0.5)',
        }}
        transition={{ duration: 0.2 }}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors',
          isFocused ? 'border-blue-500/50' : 'border-border/50'
        )}
      >
        {/* Search Icon */}
        <Search
          className={cn(
            'h-4 w-4 flex-shrink-0 transition-colors',
            isFocused ? 'text-blue-400' : 'text-secondary-500'
          )}
        />

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-secondary-500 outline-none"
        />

        {/* Clear Button */}
        <AnimatePresence>
          {value && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleClear}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="h-3 w-3 text-secondary-500" />
            </motion.button>
          )}
        </AnimatePresence>

        {/* Keyboard Hint */}
        {!value && !isFocused && (
          <div className="flex items-center gap-1 text-[10px] text-secondary-600 font-mono">
            <Command className="h-3 w-3" />
            <span>K</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
