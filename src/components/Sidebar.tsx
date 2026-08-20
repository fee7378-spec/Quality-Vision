import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Database, Users, LineChart, Layers, TrendingUp, Settings, History, Cloud } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTokenStore } from '../store/useTokenStore';
import { useTabStore } from '../store/useTabStore';

const menuItems = [
  { path: '/', label: 'Visão Geral', icon: LayoutDashboard },
  { path: '/operacao', label: 'Operação', icon: Layers },
  { path: '/capacidade', label: 'Capacidade', icon: TrendingUp },
  { path: '/analise', label: 'Qualidade', icon: LineChart },
  { path: '/analistas', label: 'Analistas', icon: Users },
  { path: '/salesforce', label: 'Salesforce', icon: Cloud },
  { path: '/history', label: 'Histórico', icon: History },
];

const settingsItem = { path: '/settings', label: 'Configurações', icon: Settings };

export const Sidebar = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { tokenRecord } = useTokenStore();
  const { visibleTabs } = useTabStore();

  const currentTipo = (tokenRecord?.tipo || 'visualizacao').toLowerCase();
  const isAdmin = currentTipo === 'administracao';

  // Filter menu items for non-admins based on admin selection
  const filteredMenuItems = menuItems.filter(item => isAdmin || visibleTabs.includes(item.path));

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
      className="bg-gray-50 dark:bg-[#0b0f19] border-r border-gray-200 dark:border-gray-800 h-full flex flex-col text-gray-500 z-50 overflow-hidden flex-shrink-0 select-none"
    >
      {/* Brand Header */}
      <div className="px-4 flex items-center h-16 border-b border-gray-200 dark:border-gray-800 gap-3 overflow-hidden">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-brand-blue dark:text-blue-400">
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
        <AnimatePresence>
          {isExpanded && (
            <motion.span 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }} 
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
              className="font-extrabold text-base text-gray-900 dark:text-white tracking-tight whitespace-nowrap overflow-hidden"
            >
              Analytics
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
        {filteredMenuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `flex items-center gap-3.5 px-3 py-2.5 rounded-md transition-all ${
                isActive 
                  ? 'bg-white dark:bg-[#192238] text-[#001E62] dark:text-blue-400 font-bold border-l-2 border-[#001E62] dark:border-blue-400 shadow-2xs' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-white'
              }`
            }
          >
            <item.icon size={19} className="flex-shrink-0 text-brand-blue dark:text-blue-400" />
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

      {/* Bottom Settings Section */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-800">
        <NavLink
          to={settingsItem.path}
          className={({ isActive }) => 
            `flex items-center gap-3.5 px-3 py-2.5 rounded-md transition-all ${
              isActive 
                ? 'bg-white dark:bg-[#192238] text-[#001E62] dark:text-blue-400 font-bold border-l-2 border-[#001E62] dark:border-blue-400 shadow-2xs' 
                : 'text-gray-600 dark:text-gray-400 hover:bg-white/80 dark:hover:bg-gray-800/80 hover:text-gray-900 dark:hover:text-white'
            }`
          }
        >
          <settingsItem.icon size={19} className="flex-shrink-0 text-brand-blue dark:text-blue-400" />
          <AnimatePresence>
            {isExpanded && (
              <motion.span 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="text-xs font-semibold uppercase tracking-wider whitespace-nowrap overflow-hidden truncate"
              >
                {settingsItem.label}
              </motion.span>
            )}
          </AnimatePresence>
        </NavLink>
      </div>
    </motion.div>
  );
};


