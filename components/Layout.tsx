import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  CalendarRange, 
  HeartPulse, 
  User,
  PanelLeftClose,
  PanelLeftOpen,
  CloudOff
} from 'lucide-react';
import { useAuth } from '../App';
import PWAStatus from './PWAStatus';

const Layout: React.FC = () => {
  const { userProfile, isPreview } = useAuth();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Removido item 'Lançar' para simplificar o app conforme solicitado
  const navItems = [
    { to: '/app/dashboard', icon: <Home size={24} />, label: 'Início' },
    { to: '/app/provision', icon: <CalendarRange size={24} />, label: 'Previsão' },
    { to: '/app/restart-plan', icon: <HeartPulse size={24} />, label: 'Recomeço' },
    { to: '/app/profile', icon: <User size={24} />, label: 'Perfil' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row transition-colors duration-300 dark:bg-slate-950">
      <PWAStatus />

      {/* Banner Preview */}
      {isPreview && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest py-1 px-4 flex items-center justify-center gap-2">
          <CloudOff size={12} /> Modo Demonstração (Dados Locais)
        </div>
      )}

      {/* Sidebar Desktop */}
      <aside className={`hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-blue-50 dark:border-slate-800 transition-all duration-300 fixed h-full z-50 ${isSidebarOpen ? 'w-72' : 'w-20'} ${isPreview ? 'pt-6' : ''}`}>
        <div className="p-6 flex items-center justify-between">
          {isSidebarOpen && <span className="text-2xl font-black text-blue-600 tracking-tighter uppercase">Azular</span>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-slate-400 hover:text-blue-600">
            {isSidebarOpen ? <PanelLeftClose size={20} /> : <PanelLeftOpen size={20} />}
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => 
                `flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all font-bold ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-none' 
                    : 'text-slate-400 hover:bg-blue-50 dark:hover:bg-slate-800 hover:text-blue-600'
                }`
              }
            >
              {item.icon}
              {isSidebarOpen && <span className="text-sm">{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        {isSidebarOpen && (
          <div className="p-6 border-t border-blue-50 dark:border-slate-800">
            <div className="flex items-center gap-4 p-3 bg-blue-50 dark:bg-slate-800 rounded-2xl">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center font-black text-white">
                {userProfile?.displayName?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-black truncate text-slate-900 dark:text-white uppercase">{userProfile?.displayName || 'Usuário'}</p>
                <p className="text-[9px] font-bold text-blue-400 uppercase">
                  {isPreview ? 'Visitante Demo' : 'Membro Azular'}
                </p>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 flex flex-col min-h-screen pb-24 md:pb-0 transition-all duration-300 ${isSidebarOpen ? 'md:ml-72' : 'md:ml-20'} ${isPreview ? 'pt-6' : ''}`}>
        <div className="flex-1 w-full max-w-4xl mx-auto md:p-8 p-4">
          <Outlet />
        </div>
      </main>

      {/* Bottom Bar Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 flex justify-around items-center px-2 z-50">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 
              `flex flex-col items-center justify-center flex-1 gap-1 transition-all ${
                isActive ? 'text-blue-600' : 'text-slate-400'
              }`
            }
          >
            <div className={`p-1 rounded-xl transition-all ${location.pathname === item.to ? 'scale-110' : 'scale-100'}`}>
              {item.icon}
            </div>
            <span className={`text-[10px] font-bold tracking-tight ${location.pathname === item.to ? 'opacity-100' : 'opacity-60'}`}>
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Layout;