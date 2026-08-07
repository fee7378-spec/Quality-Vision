import React, { useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Info, HelpCircle } from 'lucide-react';

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  type?: 'confirm' | 'alert' | 'success' | 'error' | 'info';
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
}

export const CustomModal: React.FC<CustomModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  type = 'info',
  onConfirm,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
}) => {

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'confirm':
        return <HelpCircle className="text-[#001E62]" size={28} />;
      case 'error':
        return <AlertTriangle className="text-red-600" size={28} />;
      case 'success':
        return <CheckCircle className="text-emerald-600" size={28} />;
      case 'alert':
        return <AlertTriangle className="text-[#001E62]" size={28} />;
      case 'info':
      default:
        return <Info className="text-[#001E62]" size={28} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-50/80 backdrop-blur-md z-50 flex items-center justify-center p-4 transition-all animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-lg p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 text-gray-900">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gray-50 border border-gray-200 rounded-md shrink-0">
              {getIcon()}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 leading-tight">{title}</h3>
              {type === 'confirm' && (
                <span className="text-[10px] uppercase tracking-wider font-semibold text-[#001E62]">
                  Confirmação
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-500 hover:text-gray-900 bg-gray-50 border border-gray-200 rounded-md hover:border-gray-300 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {description && (
          <p className="text-xs text-gray-700 leading-relaxed bg-gray-50/50 border border-gray-200 p-3.5 rounded-md font-normal">
            {description}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          {type === 'confirm' ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-200 rounded-md hover:text-gray-900 hover:border-gray-300 transition-all cursor-pointer"
              >
                {cancelText}
              </button>
              <button
                onClick={() => {
                  if (onConfirm) onConfirm();
                  onClose();
                }}
                className="px-4 py-2 text-xs font-bold bg-white text-brand-blue border border-brand-blue rounded-md hover:bg-brand-blue hover:text-white active:scale-95 transition-all shadow-md cursor-pointer"
              >
                {confirmText}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-bold bg-white text-brand-blue border border-brand-blue rounded-md hover:bg-brand-blue hover:text-white active:scale-95 transition-all shadow-md cursor-pointer"
            >
              Entendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
