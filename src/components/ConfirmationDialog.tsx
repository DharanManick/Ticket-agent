import React, { useEffect } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  X, 
  ShieldAlert, 
  Database, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
  affectedRecords?: {
    count: number;
    label: string;
    sublabel?: string;
  };
  warningNote?: string;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = "Confirm Action",
  cancelText = "Cancel",
  variant = 'danger',
  icon,
  affectedRecords,
  warningNote,
  isLoading = false,
  onConfirm,
  onCancel
}: ConfirmationDialogProps) {

  // Keyboard accessibility: Escape to cancel, Enter to confirm (when open & not loading)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (!isLoading) onCancel();
      } else if (e.key === 'Enter' && !isLoading) {
        // Only confirm on Enter if target isn't the cancel button
        const activeElem = document.activeElement;
        if (activeElem && activeElem.getAttribute('data-action') === 'cancel') {
          return;
        }
        e.preventDefault();
        onConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel, onConfirm]);

  const variantStyles = {
    danger: {
      border: 'border-red-500/30',
      glow: 'shadow-red-950/20',
      iconBg: 'bg-red-500/10 border-red-500/25 text-red-400',
      confirmBtn: 'bg-red-600 hover:bg-red-700 text-white shadow-red-950/40 hover:ring-2 hover:ring-red-500/30',
      badgeBorder: 'border-red-500/20 bg-red-950/25 text-red-300',
      badgeText: 'text-red-400'
    },
    warning: {
      border: 'border-amber-500/30',
      glow: 'shadow-amber-950/20',
      iconBg: 'bg-amber-500/10 border-amber-500/25 text-amber-400',
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-950/40 hover:ring-2 hover:ring-amber-500/30',
      badgeBorder: 'border-amber-500/20 bg-amber-950/25 text-amber-300',
      badgeText: 'text-amber-400'
    },
    info: {
      border: 'border-blue-500/30',
      glow: 'shadow-blue-950/20',
      iconBg: 'bg-blue-500/10 border-blue-500/25 text-blue-400',
      confirmBtn: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-950/40 hover:ring-2 hover:ring-blue-500/30',
      badgeBorder: 'border-blue-500/20 bg-blue-950/25 text-blue-300',
      badgeText: 'text-blue-400'
    }
  }[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          className="fixed inset-0 z-55 flex items-center justify-center p-4 sm:p-6" 
          id="confirmation-dialog" 
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirmation-dialog-title"
          aria-describedby="confirmation-dialog-desc"
          style={{ zIndex: 99999 }}
        >
          {/* Backdrop overlay */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-sm cursor-pointer" 
            onClick={() => {
              if (!isLoading) onCancel();
            }}
          />

          {/* Modal Dialog container frame */}
          <motion.div 
            initial={{ scale: 0.94, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 8 }}
            transition={{ type: 'spring', damping: 26, stiffness: 360 }}
            className={`relative transform overflow-hidden rounded-2xl bg-gradient-to-b from-[#181B24] via-[#14161F] to-[#0F1117] border ${variantStyles.border} text-left shadow-2xl ${variantStyles.glow} w-full max-w-lg p-6 z-10`}
          >
            {/* Top header section */}
            <div className="flex items-start space-x-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${variantStyles.iconBg}`}>
                {icon || (variant === 'danger' ? <Trash2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 
                    id="confirmation-dialog-title"
                    className="text-base font-bold text-white tracking-tight leading-snug"
                  >
                    {title}
                  </h3>
                  <button 
                    type="button" 
                    data-action="cancel"
                    disabled={isLoading}
                    onClick={onCancel}
                    className="text-gray-400 hover:text-white rounded-lg p-1 hover:bg-[#2A2D35] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                    aria-label="Close dialog"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>

                <p 
                  id="confirmation-dialog-desc"
                  className="mt-2 text-xs text-gray-300 leading-relaxed font-sans"
                >
                  {message}
                </p>
              </div>
            </div>

            {/* Affected Records Impact Counter Box */}
            {affectedRecords && (
              <div className={`mt-4.5 p-3.5 rounded-xl border ${variantStyles.badgeBorder} flex items-center justify-between gap-3`}>
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center shrink-0">
                    <Database className="h-4 w-4 text-gray-300" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block font-semibold">
                      Records Impacted
                    </span>
                    <span className="text-xs text-gray-200 font-medium truncate block">
                      {affectedRecords.sublabel || affectedRecords.label}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className={`text-xl font-black font-mono tracking-tight block ${variantStyles.badgeText}`}>
                    {affectedRecords.count}
                  </span>
                  <span className="text-[9px] uppercase font-mono text-gray-400 block font-medium">
                    {affectedRecords.label}
                  </span>
                </div>
              </div>
            )}

            {/* Warning Note Callout */}
            {warningNote && (
              <div className="mt-3 flex items-start space-x-2.5 p-2.5 rounded-lg bg-red-950/20 border border-red-900/30 text-red-300 text-[11px] leading-relaxed">
                <ShieldAlert className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <span>{warningNote}</span>
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 pt-4 border-t border-[#2A2D35]/70">
              <button
                type="button"
                data-action="cancel"
                disabled={isLoading}
                className="w-full sm:w-auto rounded-xl px-4 py-2 text-xs font-mono font-bold text-gray-300 hover:bg-[#252833] hover:text-white border border-[#2A2D35] cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={onCancel}
              >
                {cancelText}
              </button>

              <button
                type="button"
                data-action="confirm"
                disabled={isLoading}
                className={`w-full sm:w-auto rounded-xl font-mono font-bold text-xs px-5 py-2.5 cursor-pointer transition-all shadow-md flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantStyles.confirmBtn}`}
                onClick={onConfirm}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    {variant === 'danger' && <Trash2 className="h-3.5 w-3.5" />}
                    <span>{confirmText}</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
