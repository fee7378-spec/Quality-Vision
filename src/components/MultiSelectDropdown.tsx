import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import { FilterValue } from '../store/useStore';

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: FilterValue;
  onChange: (val: FilterValue) => void;
  defaultOption?: string;
  className?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  options,
  selected,
  onChange,
  defaultOption = 'TODAS',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedArray = Array.isArray(selected)
    ? selected
    : (selected ? [selected] : [defaultOption]);

  const isAllSelected = selectedArray.includes(defaultOption) || selectedArray.length === 0;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleOption = (opt: string) => {
    if (opt === defaultOption) {
      onChange([defaultOption]);
      return;
    }

    let next: string[];
    if (isAllSelected) {
      next = [opt];
    } else {
      if (selectedArray.includes(opt)) {
        next = selectedArray.filter(item => item !== opt && item !== defaultOption);
      } else {
        next = [...selectedArray.filter(item => item !== defaultOption), opt];
      }
    }

    const regularOptions = options.filter(o => o !== defaultOption);
    if (next.length === 0 || next.length === regularOptions.length) {
      onChange([defaultOption]);
    } else {
      onChange(next);
    }
  };

  const getDisplayText = () => {
    if (isAllSelected) return defaultOption;
    if (selectedArray.length === 1) return selectedArray[0];
    return `${selectedArray.length} selecionados`;
  };

  const filteredOptions = options.filter(o => 
    o.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <div className="flex items-center gap-1.5">
        <span className="text-gray-500 font-semibold text-[11px] uppercase tracking-wider">{label}:</span>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 hover:border-brand-blue-dark/60 rounded-md px-2.5 py-1 text-xs text-gray-900 outline-none cursor-pointer transition-all ${className}`}
        >
          <span className="truncate max-w-[130px] font-medium text-left">
            {getDisplayText()}
          </span>
          <ChevronDown size={13} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-60 bg-white border border-gray-200 rounded-lg shadow-2xl z-50 p-2 space-y-1.5">
          {options.length > 5 && (
            <div className="relative flex items-center">
              <Search size={12} className="absolute left-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="Pesquisar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded pl-7 pr-6 py-1 text-xs text-gray-900 placeholder-zinc-500 outline-none focus:border-brand-blue-dark"
              />
              {search && (
                <button 
                  onClick={() => setSearch('')}
                  className="absolute right-2 text-gray-400 hover:text-gray-900"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1 text-xs">
            {filteredOptions.map((opt) => {
              const isChecked = opt === defaultOption 
                ? isAllSelected 
                : (!isAllSelected && selectedArray.includes(opt));

              return (
                <label
                  key={opt}
                  onClick={() => handleToggleOption(opt)}
                  className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors select-none ${
                    isChecked ? 'bg-brand-blue/10 text-brand-blue-light font-semibold' : 'text-gray-700 hover:bg-white'
                  }`}
                >
                  <span className="truncate pr-2">{opt}</span>
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                    isChecked ? 'bg-white border-[#001E62] text-[#001E62]' : 'border-gray-300 bg-white'
                  }`}>
                    {isChecked && <Check size={11} className="stroke-[3] text-[#001E62]" />}
                  </div>
                </label>
              );
            })}
          </div>

          {!isAllSelected && (
            <div className="pt-1.5 border-t border-gray-200/80 flex justify-between items-center px-1 text-[11px]">
              <span className="text-gray-500">{selectedArray.length} selecionado(s)</span>
              <button
                type="button"
                onClick={() => onChange([defaultOption])}
                className="text-brand-blue hover:underline font-medium"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
