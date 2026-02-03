
import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  CalendarRange, 
  Wallet, 
  TrendingUp, 
  UserCircle,
  HeartPulse,
  Menu,
  X,
  ChevronRight,
  LayoutDashboard,
  User as UserIcon,
  Waves,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Download
} from 'lucide-react';
import { useAuth } from '../App';
import PWAStatus from './PWAStatus';

const Layout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopVisible, setIsDesktopVisible] = useState(true);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  
  const { userProfile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });

    window.addEventListener('appinstalled', () => {
      setShowInstallBtn(false);
      setDeferredPrompt(null);
    });
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const navItems = [
    { to: '/app/dashboard', icon: <LayoutDashboard size={22} />, label: 'Início' },
    { to: '/app/transactions', icon: <PlusCircle size={22} />, label: 'Lançamentos (Real)' },
    { to: '/app/provision', icon: <CalendarRange size={22} />, label: 'Provisão (Plano)' },
    { to: '/app/restart-plan', icon: <HeartPulse size={22} />, label: 'Recomeço' },
    { to: '/app/accounts', icon: <Wallet size={22} />, label: 'Minhas Contas' },
    { to: '/app/analysis', icon: <TrendingUp size={22} />, label: 'Análise' },
    { to: '/app/profile', icon: <UserCircle size={22} />, label: 'Meu Perfil' },
  ];

  const renderAvatar = (sizeClass: string) => {
    const avatar = userProfile?.avatarUrl;
    const isImage = avatar && (avatar.startsWith('data:image') || avatar.startsWith('http'));

    return (
      <div className={`${sizeClass} bg-blue-100 rounded-2xl flex items-center justify-center shadow-inner border border-white overflow-hidden shrink-0`}>
        {isImage ? (
          <img src={avatar} alt="User" className="w-full h-full object-cover" />
        ) : (
          <UserIcon size={20} className="text-blue-400" />
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col min-h-screen bg-[#F8FAFF] pb-24 md:pb-0 transition-all duration-300 ${isDesktopVisible ? 'md:pl-72' : 'md:pl-0'}`}>
      
      <PWAStatus />

      {/* Botão de Instalação Mobile/Desktop */}
      {showInstallBtn && (
        <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[60] animate-in fade-in slide-in-from-bottom-4">
          <button 
            onClick={handleInstallClick}
            className="bg-gray-900 text-white px-6 py-4 rounded-full shadow-2xl flex items-center gap-3 font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all"
          >
            <Download size={16} /> Instalar Azular
          </button>
        </div>
      )}

      {/* FAB - Botão Flutuante Global */}
      <button 
        onClick={() => navigate('/app/transactions', { state: { openModal: true } })}
        className="fixed bottom-24 right-6 md:bottom-12 md:right-12 z-50 w-16 h-16 bg-blue-600 text-white rounded-full shadow-[0_10px_40px_rgba(37,99,235,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all animate-in fade-in slide-in-from-bottom-4"
        aria-label="Lançar Real"
      >
        <Plus size={32} />
      </button>

      {!isDesktopVisible && (
        <button 
          onClick={() => setIsDesktopVisible(true)}
          className="fixed top-6 left-6 z-50 p-3 bg-white border-2 border-blue-100 text-blue-600 rounded-2xl shadow-xl hover:scale-110 transition-all hidden md:flex items-center gap-2 group"
        >
          <PanelLeftOpen size={24} />
          <span className="text-[10px] font-black uppercase tracking-widest overflow-hidden w-0 group-hover:w-20 transition-all duration-300 whitespace-nowrap">Menu</span>
        </button>
      )}

      <header className={`sticky top-0 z-30 flex items-center justify-between px-6 py-5 bg-white/90 backdrop-blur-md border-b border-blue-50 md:hidden`}>
        <button 
          onClick={() => setIsMobileMenuOpen(true)}
          className="p-2 -ml-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
        >
          <Menu size={28} />
        </button>
        <div className="flex items-center gap-2">
           <Waves size={24} className="text-blue-600" />
           <h1 className="text-xl font-black tracking-tighter uppercase text-blue-700">Azular</h1>
        </div>
        {renderAvatar("w-10 h-10")}
      </header>

      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-blue-900/40 backdrop-blur-sm z-40 md:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <aside className={`
        fixed left-0 top-0 bottom-0 w-80 bg-blue-600 text-white z-50 
        transition-all duration-500 ease-in-out shadow-2xl
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} 
        ${isDesktopVisible ? 'md:translate-x-0 md:w-72' : 'md:-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-8 pb-4">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded-xl text-blue-600 shadow-lg">
                   <Waves size={24} />
                </div>
                <h1 className="text-2xl font-black tracking-tighter uppercase">
                  Azular
                </h1>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setIsDesktopVisible(false)}
                  className="p-2 text-blue-200 hover:text-white hidden md:block hover:bg-white/10 rounded-xl transition-all"
                >
                  <PanelLeftClose size={20} />
                </button>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 text-blue-200 hover:text-white md:hidden"
                >
                  <X size={24} />
                </button>
              </div>
            </div>
            
            <button 
               onClick={() => navigate('/app/transactions', { state: { openModal: true } })}
               className="w-full bg-white text-blue-600 p-4 rounded-2xl flex items-center justify-center gap-3 font-black uppercase text-[10px] tracking-widest shadow-xl mb-6 hover:scale-[1.02] transition-all active:scale-95"
            >
              <Plus size={18} /> Lançar Agora
            </button>

            <div className="h-px bg-white/10 w-full mb-6"></div>
          </div>

          <nav className="flex-1 px-4 overflow-y-auto custom-scrollbar space-y-2">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => 
                  `flex items-center justify-between px-6 py-4 rounded-[1.5rem] transition-all group ${
                    isActive 
                      ? 'bg-white text-blue-700 font-black shadow-xl scale-[1.02]' 
                      : 'hover:bg-white/10 text-blue-50 opacity-80 hover:opacity-100'
                  }`
                }
              >
                <div className="flex items-center gap-4">
                  <span className="shrink-0">{item.icon}</span>
                  <span className="text-sm tracking-tight font-bold">{item.label}</span>
                </div>
                <ChevronRight size={14} className={`transition-transform group-hover:translate-x-1 ${location.pathname === item.to ? 'opacity-100' : 'opacity-0'}`} />
              </NavLink>
            ))}
          </nav>

          <div className="p-6 mt-auto">
            <div className="bg-blue-700/40 p-5 rounded-[2rem] border border-white/10 flex items-center gap-4">
              {renderAvatar("w-12 h-12")}
              <div className="flex flex-col min-w-0">
                <span className="font-black text-xs uppercase truncate">{userProfile?.displayName || 'Usuário'}</span>
                <span className="text-[9px] font-black text-blue-300 uppercase tracking-widest mt-0.5">Membro Azular</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-12 lg:p-16 w-full animate-in fade-in slide-in-from-bottom-2 duration-700">
        <div className="max-w-5xl mx-auto">
          <Outlet />
        </div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-blue-50 flex justify-around items-center py-3 px-2 z-30 md:hidden shadow-[0_-8px_30px_rgba(37,99,235,0.08)]">
        {navItems.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => 
              `flex flex-col items-center gap-1 transition-all flex-1 py-1 ${
                isActive ? 'text-blue-600 scale-105 font-black' : 'text-gray-400'
              }`
            }
          >
            <div className={`${location.pathname === item.to ? 'bg-blue-50 p-2 rounded-2xl' : ''} transition-all`}>
              {React.cloneElement(item.icon as React.ReactElement<any>, { size: 22 })}
            </div>
            <span className="text-[9px] font-black uppercase tracking-tighter mt-1">{item.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
