import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Database, Users, LineChart, Layers, TrendingUp, Settings } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const menuItems = [
  { path: '/', label: 'Overview', icon: LayoutDashboard },
  { path: '/operacao', label: 'Operations', icon: Layers },
  { path: '/capacidade', label: 'Capacity', icon: TrendingUp },
  { path: '/analise', label: 'Quality', icon: LineChart },
  { path: '/analistas', label: 'Analysts', icon: Users },
  { path: '/import', label: 'Data Hub', icon: Database },
];

export const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setIsExpanded(true);
    }, 100);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsExpanded(false);
  };

  return (
    <motion.div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      initial={{ width: 72 }}
      animate={{ width: isExpanded ? 240 : 72 }}
      transition={{ type: "spring", stiffness: 350, damping: 32 }}
      className="bg-black border-r border-zinc-800 h-full flex flex-col text-zinc-400 z-50 overflow-hidden flex-shrink-0 select-none"
    >
      {/* Brand Header */}
      <div className="px-4 flex items-center h-16 border-b border-zinc-800 gap-3 overflow-hidden">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#FFFF00" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
        <AnimatePresence>
          {isExpanded && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="font-extrabold text-base text-white tracking-tight whitespace-nowrap overflow-hidden"
            >
              Analytics
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center gap-3.5 px-3 py-2.5 rounded-md transition-all ${
                isActive 
                  ? 'bg-zinc-900 text-[#FFFF00] font-bold border-l-2 border-[#FFFF00]' 
                  : 'hover:bg-zinc-900/80 hover:text-white'
              }`
            }
          >
            <item.icon size={19} className="flex-shrink-0" />
            <AnimatePresence>
              {isExpanded && (
                <motion.span 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }}
                  className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap overflow-hidden truncate"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </NavLink>
        ))}
      </nav>

      {/* Settings Button at bottom */}
      <div className="p-3 border-t border-zinc-800">
        <button
          onClick={() => {}}
          className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-md transition-all hover:bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer"
          title="Configurações"
        >
          <Settings size={19} className="flex-shrink-0" />
          <AnimatePresence>
            {isExpanded && (
              <motion.span 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap overflow-hidden truncate"
              >
                Configurações
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.div>
  );
};

