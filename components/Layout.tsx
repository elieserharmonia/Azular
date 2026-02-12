
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, CalendarRange, HeartPulse, User, BarChart2 } from 'lucide-react';

const Layout: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const navItems = [
    { to: '/app/dashboard', icon: <Home size={22} />, label: 'Início' },
    { to: '/app/contas-plano', icon: <CalendarRange size={22} />, label: 'Receber & Pagar' },
    { to: '/app/contas', icon: <BarChart2 size={22} />, label: 'Lançamentos' },
    { to: '/app/restart-plan', icon: <HeartPulse size={22} />, label: 'Recomeço' },
    { to: '/app/profile', icon: <User size={22} />, label: 'Perfil' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FE] flex flex-col">
      <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full">
        {children || <React.Fragment />}
        <div className="h-24" /> {/* Spacer for nav */}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-gray-100 px-4 py-3 flex justify-around items-center z-[50] shadow-2xl md:max-w-md md:mx-auto md:mb-6 md:rounded-full md:bottom-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <Link 
              key={item.to} 
              to={item.to} 
              className={`flex flex-col items-center p-2 transition-all duration-300 ${isActive ? 'text-blue-600 scale-110' : 'text-gray-400'}`}
            >
              <div className={`${isActive ? 'bg-blue-50 p-2 rounded-xl shadow-inner' : ''}`}>
                {item.icon}
              </div>
              <span className={`text-[8px] font-black uppercase mt-1 tracking-tighter ${isActive ? 'opacity-100' : 'opacity-60'}`}>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default Layout;
