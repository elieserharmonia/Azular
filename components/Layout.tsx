
import React from 'react';
import { Link } from 'react-router-dom';
import { Home, CalendarRange, HeartPulse, User } from 'lucide-react';

const Layout: React.FC = () => {
  const navItems = [
    { to: '/app/dashboard', icon: <Home size={24} />, label: 'Início' },
    { to: '/app/contas', icon: <CalendarRange size={24} />, label: 'Minhas Contas' },
    { to: '/app/restart-plan', icon: <HeartPulse size={24} />, label: 'Recomeço' },
    { to: '/app/profile', icon: <User size={24} />, label: 'Perfil' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 flex justify-around items-center z-50">
        {navItems.map((item) => (
          <Link key={item.to} to={item.to} className="flex flex-col items-center p-2 text-gray-600 hover:text-blue-600 transition-colors">
            {item.icon}
            <span className="text-[10px] font-bold uppercase mt-1">{item.label}</span>
          </Link>
        ))}
      </nav>
      <main className="p-4 md:p-8">
        {/* Children content rendered here */}
      </main>
    </div>
  );
};

export default Layout;
