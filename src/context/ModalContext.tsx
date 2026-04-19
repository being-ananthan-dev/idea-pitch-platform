import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

type ModalType = 'info' | 'warning' | 'error' | 'success';

interface ModalOptions {
  title: string;
  message: string;
  type?: ModalType;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

interface ModalContextType {
  showModal: (options: ModalOptions) => void;
  hideModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [modalOptions, setModalOptions] = useState<ModalOptions | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const showModal = useCallback((options: ModalOptions) => {
    setModalOptions(options);
    setIsOpen(true);
  }, []);

  const hideModal = useCallback(() => {
    setIsOpen(false);
    // Delay clearing options to allow exit animation
    setTimeout(() => setModalOptions(null), 300);
  }, []);

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      {modalOptions && (
        <ModalComponent
          isOpen={isOpen}
          options={modalOptions}
          onClose={hideModal}
        />
      )}
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

// ── Internal Modal Component ──────────────────────────────────────────────

import { X, Info, AlertTriangle, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

function ModalComponent({
  isOpen,
  options,
  onClose,
}: {
  isOpen: boolean;
  options: ModalOptions;
  onClose: () => void;
}) {
  const { title, message, type = 'info', onConfirm, confirmText = 'Acknowledged', cancelText = 'Cancel', showCancel = false } = options;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    onClose();
  };

  const Icons = {
    info: <Info className="w-6 h-6 text-blue-400" />,
    warning: <AlertTriangle className="w-6 h-6 text-amber-400" />,
    error: <AlertCircle className="w-6 h-6 text-red-400" />,
    success: <CheckCircle className="w-6 h-6 text-green-400" />,
  };

  const Colors = {
    info: 'border-blue-500/20 bg-blue-500/5',
    warning: 'border-amber-500/20 bg-amber-500/5',
    error: 'border-red-500/20 bg-red-500/5',
    success: 'border-green-500/20 bg-green-500/5',
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 ${
        isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div
        className={`relative w-full max-w-md glass-card p-0 overflow-hidden transition-all duration-300 transform ${
          isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        }`}
      >
        <div className={`p-6 border-b border-white/5 flex items-center gap-4 ${Colors[type]}`}>
          <div className="w-12 h-12 rounded-2xl bg-black/20 flex items-center justify-center shrink-0">
            {Icons[type]}
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-white leading-tight">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8">
          <p className="text-gray-300 leading-relaxed text-sm">
            {message}
          </p>

          <div className="mt-8 flex items-center gap-3">
            {showCancel && (
              <button
                onClick={onClose}
                className="btn-secondary flex-1 py-3"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className="btn-primary flex-1 py-3"
            >
              {confirmText}
            </button>
          </div>
        </div>
        
        {/* Aesthetic bottom bar */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
      </div>
    </div>
  );
}
