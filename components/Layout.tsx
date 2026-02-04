import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  CalendarRange, 
  HeartPulse, 
  UserCircle,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Plus
} from 'lucide-react';
import { useAuth } from '../App';
import PWAStatus from './PWAStatus';

const Layout: React.FC = () => {
  const [isDesktopVisible, setIsDesktopVisible] = useState(true);
  const { userProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Gerenciamento de Tema
  const [theme, setTheme] = useState(() => localStorage.getItem('azular_theme') || 'light');
  
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('azular_theme', theme);
  }, [theme]);

  const navItems = [
    { to: '/app/dashboard', icon: <LayoutDashboard size={24} />, label: 'Início' },
    { to: '/app/transactions', icon: <PlusCircle size={24} />, label: 'Lançar' },
    { to: '/app/provision', icon: <CalendarRange size={24} />, label: 'Provisão' },
    { to: '/app/restart-plan', icon: <HeartPulse size={24} />, label: 'Recomeço' },
    { to: '/app/profile', icon: <UserCircle size={24} />, label: 'Perfil' },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === 'dark' ? 'dark bg-slate-900' : 'bg-[#F8FAFF]'} ${isDesktopVisible ? 'md:pl-72' : 'md:pl-0'}`}>
      <PWAStatus />

      {/* FAB Mobile - Centralizado Estilo Banco para Lançamento Rápido */}
      <button 
        onClick={() => navigate('/app/transactions', { state: { openModal: true } })}
        className="fixed bottom-24 right-6 md:hidden z-50 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center active:scale-95 transition-transform"
      >
        <Plus size={28} />
      </button>

      {/* Sidebar Desktop (Opcional esconder) */}
      <aside className={`fixed left-0 top-0 bottom-0 bg-white dark:bg-slate-800 z-50 transition-all duration-300 border-r border-blue-50 dark:border-slate-700 shadow-xl hidden md:flex flex-col ${isDesktopVisible ? 'w-72 translate-x-0' : 'w-0 -translate-x-full'}`}>
        <div className="p-8 flex items-center justify-between border-b border-blue-50 dark:border-slate-700">
          <span className="text-2xl font-black text-blue-600 tracking-tighter uppercase">Azular</span>
          <button onClick={() => setIsDesktopVisible(false)} className="text-slate-400 hover:text-blue-600"><PanelLeftClose size={20} /></button>
        </div>
        
        <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 
                `flex items-center gap-4 px-6 py-4 rounded-2xl transition-all font-bold ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600'
                }`
              }
            >
              {item.icon}
              <span className="text-sm">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-6 border-t border-blue-50 dark:border-slate-700">
           <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-slate-700/50 rounded-2xl">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-black text-blue-600">
                {userProfile?.displayName?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black truncate text-slate-900 dark:text-white uppercase">{userProfile?.displayName || 'Usuário'}</p>
                <p className="text-[9px] font-bold text-blue-400 uppercase">Membro Azular</p>
              </div>
           </div>
        </div>
      </aside>

      {!isDesktopVisible && (
        <button 
          onClick={() => setIsDesktopVisible(true)}
          className="fixed top-6 left-6 z-50 p-3 bg-white dark:bg-slate-800 text-blue-600 rounded-xl shadow-lg hidden md:block"
        >
          <PanelLeftOpen size={24} />
        </button>
      )}

      {/* Área de Conteúdo */}
      <main className="min-h-screen pb-32 md:pb-12 max-w-5xl mx-auto md:p-12">
        <Outlet />
      </main>

      {/* Bottom Bar Mobile - Estilo Banco */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border-t border-blue-50 dark:border-slate-700 flex justify-around items-center px-4 z-[40] md:hidden">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 
              `flex flex-col items-center justify-center flex-1 gap-1 transition-all ${
                isActive ? 'text-blue-600 font-black' : 'text-slate-400'
              }`
            }
          >
            <div className="p-1 rounded-xl transition-all">
              {item.icon}
            </div>
            <span className="text-[9px] uppercase tracking-tighter">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Layout;