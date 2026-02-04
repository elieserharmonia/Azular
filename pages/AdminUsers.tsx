import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { useNavigate } from 'react-router-dom';
import { getAdminUsersForExport } from '../services/db';
import { UserProfile } from '../types';
import { 
  ChevronLeft, 
  FileDown, 
  Users, 
  Search, 
  ShieldAlert,
  Calendar,
  Phone,
  Mail,
  User as UserIcon,
  // Added Loader2 to fix compilation error
  Loader2
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';

const AdminUsers: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const ADMIN_EMAIL = "apptanamaoprofissionais@gmail.com";
  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isAdmin && user) {
      return;
    }
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getAdminUsersForExport();
      setUsers(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Nome Completo', 'E-mail', 'Telefone', 'Nascimento', 'Endereço', 'Data Consentimento', 'Opt-In Text'];
    
    const rows = users.map(u => [
      u.fullName || u.displayName || 'Sem Nome',
      u.email || '',
      u.phone || '',
      u.birthDate || '',
      u.address?.logradouro || '',
      u.marketingOptInAt ? new Date(u.marketingOptInAt.seconds * 1000).toLocaleDateString() : 'N/A',
      u.marketingOptInText || ''
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const today = new Date().toISOString().split('T')[0];
    
    link.setAttribute("href", url);
    link.setAttribute("download", `azular-leads-optin-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredUsers = users.filter(u => 
    (u.fullName?.toLowerCase() || u.displayName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (u.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center animate-bounce">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tighter">Acesso Negado</h2>
        <p className="text-gray-400 font-bold uppercase text-[10px] tracking-widest max-w-xs">Esta área é restrita aos administradores do sistema Azular.</p>
        <button onClick={() => navigate(-1)} className="bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl">Voltar</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-32">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-3 bg-white rounded-2xl shadow-sm text-gray-600 hover:bg-blue-50">
            <ChevronLeft size={24} />
          </button>
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tighter">Gestão LGPD</h2>
            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-1">Exportação de Consentimentos</p>
          </div>
        </div>
        <button 
          onClick={exportToCSV}
          className="bg-gray-900 text-white px-8 py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest shadow-2xl flex items-center gap-3 hover:scale-105 transition-all"
        >
          <FileDown size={20} /> Exportar Leads CSV
        </button>
      </header>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
        <input 
          type="text" 
          placeholder="Pesquisar por nome ou e-mail..."
          className="w-full bg-white border-2 border-blue-50 p-6 pl-16 rounded-[2rem] font-bold outline-none focus:border-blue-600 shadow-sm"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border-2 border-blue-50 overflow-hidden">
        <div className="p-6 bg-blue-50/50 flex items-center gap-3 text-blue-900">
          <Users size={20} />
          <span className="text-[10px] font-black uppercase tracking-widest">Base de Consentimento ({users.length} usuários)</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b text-[9px] font-black uppercase text-gray-400 tracking-widest">
              <tr>
                <th className="px-8 py-5">Usuário</th>
                <th className="px-8 py-5">Contato</th>
                <th className="px-8 py-5">Nascimento</th>
                <th className="px-8 py-5">Localização</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map(u => (
                <tr key={u.uid} className="hover:bg-blue-50/20 transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center overflow-hidden shrink-0">
                        {u.avatarUrl ? <img src={u.avatarUrl} className="w-full h-full object-cover" /> : <UserIcon size={18} className="text-blue-400" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black uppercase text-xs text-gray-900 truncate">{u.fullName || u.displayName || 'Sem Nome'}</p>
                        <p className="text-[9px] font-bold text-gray-400 uppercase">{u.uid}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                        <Mail size={12} className="text-blue-300" /> {u.email}
                      </div>
                      {u.phone && (
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-600">
                          <Phone size={12} className="text-emerald-400" /> {u.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase">
                      <Calendar size={14} className="text-gray-300" /> {u.birthDate || '--/--/----'}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <p className="text-[10px] font-bold text-gray-400 uppercase truncate max-w-[200px]">
                      {u.address?.logradouro || 'Não informado'}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {loading && (
          <div className="p-20 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-blue-600" size={32} />
            <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Consultando base...</span>
          </div>
        )}

        {!loading && filteredUsers.length === 0 && (
          <div className="p-20 text-center text-[10px] font-black uppercase text-gray-300 tracking-widest">Nenhum registro encontrado</div>
        )}
      </div>
    </div>
  );
};

export default AdminUsers;