
import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import Analysis from './pages/Analysis';
import Transactions from './pages/Transactions';
import Provision from './pages/Provision';
import Accounts from './pages/Accounts';
import Goals from './pages/Goals';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import PrintReport from './pages/PrintReport';
import RestartPlan from './pages/RestartPlan';
import Diagnostics from './pages/Diagnostics';
import BrandingLab from './pages/BrandingLab';

// Components
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import { ToastProvider } from './context/ToastContext';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  userProfile: any | null;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, userProfile: null });
export const useAuth = () => useContext(AuthContext);

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
          } else {
            const defaultProfile = {
              uid: currentUser.uid,
              displayName: currentUser.displayName || 'Usuário',
              email: currentUser.email,
              currency: 'BRL',
              locale: 'pt-BR',
              timezone: 'America/Sao_Paulo',
              monthStartDay: 1,
              avatarUrl: null
            };
            await setDoc(doc(db, 'users', currentUser.uid), defaultProfile);
            setUserProfile(defaultProfile);
          }
        } catch (e) {
          console.error("Erro ao carregar perfil:", e);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return (
    <ToastProvider>
      <AuthContext.Provider value={{ user, loading, userProfile }}>
        <Routes key={user?.uid}>
          <Route path="/login" element={user ? <Navigate to="/app/dashboard" /> : <Login />} />
          <Route path="/signup" element={user ? <Navigate to="/app/dashboard" /> : <Signup />} />
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
            <Route path="branding" element={<BrandingLab />} />
            <Route index element={<Navigate to="/app/dashboard" />} />
          </Route>

          <Route path="/" element={<Navigate to="/app/dashboard" />} />
        </Routes>
      </AuthContext.Provider>
    </ToastProvider>
  );
};

export default App;
