import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Laptop, Check } from 'lucide-react';
import { useTheme, Theme } from './ThemeProvider';

interface ThemeToggleProps {
  variant?: 'button' | 'dropdown' | 'segmented';
  className?: string;
}

export function ThemeToggle({ variant = 'button', className = '' }: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'segmented') {
    return (
      <div className={`inline-flex items-center p-0.5 rounded-lg bg-muted/60 border border-border ${className}`}>
        <button
          type="button"
          onClick={() => setTheme('light')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            theme === 'light'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Light theme"
        >
          <Sun className="h-3.5 w-3.5 text-amber-500" />
          <span className="hidden sm:inline">Light</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('system')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            theme === 'system'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="System theme"
        >
          <Laptop className="h-3.5 w-3.5 text-blue-400" />
          <span className="hidden sm:inline">System</span>
        </button>

        <button
          type="button"
          onClick={() => setTheme('dark')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            theme === 'dark'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Dark theme"
        >
          <Moon className="h-3.5 w-3.5 text-indigo-400" />
          <span className="hidden sm:inline">Dark</span>
        </button>
      </div>
    );
  }

  if (variant === 'dropdown') {
    return (
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`p-1.5 rounded-md bg-muted/50 border border-border hover:bg-muted text-foreground transition-all cursor-pointer flex items-center gap-1.5 ${className}`}
          title={`Current theme: ${theme} (Click to change)`}
          aria-expanded={isOpen}
        >
          {resolvedTheme === 'dark' ? (
            <Moon className="h-3.5 w-3.5 text-indigo-400" />
          ) : (
            <Sun className="h-3.5 w-3.5 text-amber-500" />
          )}
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-36 rounded-lg bg-card border border-border shadow-md py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
            <button
              type="button"
              onClick={() => {
                setTheme('light');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors hover:bg-muted ${
                theme === 'light' ? 'text-primary font-semibold' : 'text-muted-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                <Sun className="h-3.5 w-3.5 text-amber-500" />
                Light
              </span>
              {theme === 'light' && <Check className="h-3.5 w-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setTheme('dark');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors hover:bg-muted ${
                theme === 'dark' ? 'text-primary font-semibold' : 'text-muted-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                <Moon className="h-3.5 w-3.5 text-indigo-400" />
                Dark
              </span>
              {theme === 'dark' && <Check className="h-3.5 w-3.5" />}
            </button>

            <button
              type="button"
              onClick={() => {
                setTheme('system');
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-1.5 text-xs text-left transition-colors hover:bg-muted ${
                theme === 'system' ? 'text-primary font-semibold' : 'text-muted-foreground'
              }`}
            >
              <span className="flex items-center gap-2">
                <Laptop className="h-3.5 w-3.5 text-blue-400" />
                System
              </span>
              {theme === 'system' && <Check className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </div>
    );
  }

  // Default button variant: quick toggle between dark and light with subtle feedback
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`p-1.5 rounded-md bg-muted/60 border border-border hover:bg-muted text-foreground transition-all cursor-pointer ${className}`}
      title={resolvedTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-3.5 w-3.5 text-amber-400 hover:text-amber-300 transition-colors" />
      ) : (
        <Moon className="h-3.5 w-3.5 text-indigo-500 hover:text-indigo-600 transition-colors" />
      )}
    </button>
  );
}

export default ThemeToggle;
