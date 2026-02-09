
import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { firebaseEnabled, getFirebaseApp } from './lib/firebase';
import { isPreview } from './utils/env';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Analysis from './pages/Analysis';
import Transactions from './pages/Transactions';
import Provision from './pages/Provision';
import RestartPlan from './pages/RestartPlan';
import Accounts from './pages/Accounts';
import Goals from './pages/Goals';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import PrintReport from './pages/PrintReport';
import Diagnostics from './pages/Diagnostics';
import AdminUsers from './pages/AdminUsers';

// Components
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import { ToastProvider } from './context/ToastContext';
import { CloudOff } from 'lucide-react';

interface AuthContextType {
  user: any | null;
  loading: boolean;
  userProfile: any | null;
  isPreview: boolean;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  userProfile: null,
  isPreview: false 
});

export const useAuth = () => useContext(AuthContext);

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, loading, isPreview } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user && !isPreview) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const isPreviewMode = isPreview();

  useEffect(() => {
    let unsubscribeAuth: any = null;

    const initAuth = async () => {
      // MODO PREVIEW: Forçar estado simulado
      if (isPreviewMode) {
        setUser({ uid: 'preview-user', email: 'demo@azular.app' });
        const localProf = localStorage.getItem('azular_preview_profile');
        setUserProfile(localProf ? JSON.parse(localProf) : { 
          displayName: 'Demo', 
          fullName: 'Usuário Demonstração',
          currency: 'BRL',
          uid: 'preview-user' 
        });
        setLoading(false);
        return;
      }

      // MODO FIREBASE: Importação dinâmica protegida
      if (firebaseEnabled) {
        try {
          const app = await getFirebaseApp();
          if (!app) { setLoading(false); return; }

          const { getAuth, onAuthStateChanged } = await import('firebase/auth');
          const { getFirestore, doc, onSnapshot } = (await import('firebase/firestore')) as any;
          
          const auth = getAuth(app);
          const db = getFirestore(app);

          unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
              onSnapshot(doc(db, 'users', currentUser.uid), (snapshot: any) => {
                if (snapshot.exists()) setUserProfile(snapshot.data());
                setLoading(false);
              }, () => setLoading(false));
            } else {
              setUserProfile(null);
              setLoading(false);
            }
          });
        } catch (e) {
          console.error("Auth init error:", e);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };

    initAuth();
    return () => unsubscribeAuth && unsubscribeAuth();
  }, [isPreviewMode]);

  return (
    <ToastProvider>
      <AuthContext.Provider value={{ user, loading, userProfile, isPreview: isPreviewMode }}>
        {isPreviewMode && (
          <div className="bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest py-1.5 px-4 text-center sticky top-0 z-[1000] shadow-md flex items-center justify-center gap-2">
            <CloudOff size={14} /> Modo Preview — Dados locais salvos no navegador
          </div>
        )}
        <Routes>
          <Route path="/login" element={(user && !isPreviewMode) ? <Navigate to="/app/dashboard" /> : <Login />} />
          <Route path="/signup" element={(user && !isPreviewMode) ? <Navigate to="/app/dashboard" /> : <Signup />} />
          <Route path="/print" element={<ProtectedRoute><PrintReport /></ProtectedRoute>} />
          <Route path="/diagnostics" element={<ProtectedRoute><Diagnostics /></ProtectedRoute>} />
          
          <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="analysis" element={<Analysis />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="provision" element={<Provision />} />
            <Route path="restart-plan" element={<RestartPlan />} />
            <Route path="accounts" element={<Accounts />} />
            <Route path="goals" element={<Goals />} />
            <Route path="reports" element={<Reports />} />
            <Route path="profile" element={<Profile />} />
            <Route index element={<Navigate to="/app/dashboard" />} />
          </Route>
          <Route path="/admin/usuarios" element={<ProtectedRoute><AdminUsers /></ProtectedRoute>} />
          <Route path="/" element={<Navigate to="/app/dashboard" />} />
        </Routes>
      </AuthContext.Provider>
    </ToastProvider>
  );
};

export default App;
