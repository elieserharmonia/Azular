import React, { useState, useEffect, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { firebaseEnabled } from './lib/firebase';
import { getAuthClient } from './services/authClient';
import { getDb } from './services/firestoreClient';
import { isAiStudioPreview } from './utils/env';

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
import RestartPlanPage from './pages/RestartPlan';
import Diagnostics from './pages/Diagnostics';
import AdminUsers from './pages/AdminUsers';

// Components
import Layout from './components/Layout';
import LoadingScreen from './components/LoadingScreen';
import { ToastProvider } from './context/ToastContext';

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
  const isPreview = isAiStudioPreview();

  useEffect(() => {
    let unsubscribeAuth: () => void = () => {};
    let unsubscribeProfile: (() => void) | null = null;

    const initAuth = async () => {
      if (isPreview || !firebaseEnabled) {
        // Mock User para Preview com persistência local simples
        const savedProfile = localStorage.getItem('azular_preview_profile');
        setUser({ uid: 'preview-uid', email: 'preview@azular.app' });
        setUserProfile(savedProfile ? JSON.parse(savedProfile) : { displayName: 'Visitante Preview', currency: 'BRL' });
        setLoading(false);
        return;
      }

      try {
        const auth = await getAuthClient();
        const db = await getDb();
        const { onAuthStateChanged } = await import('firebase/auth');
        const { doc, onSnapshot, setDoc, serverTimestamp, getDoc } = await import('firebase/firestore');
        
        unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
          if (unsubscribeProfile) {
            unsubscribeProfile();
            unsubscribeProfile = null;
          }

          setUser(currentUser);
          
          if (currentUser) {
            // Escuta o perfil em tempo real para que qualquer mudança salve na hora na UI
            const userDocRef = doc(db, 'users', currentUser.uid);
            
            unsubscribeProfile = onSnapshot(userDocRef, async (snapshot) => {
              if (snapshot.exists()) {
                setUserProfile(snapshot.data());
              } else {
                // Cria perfil padrão se não existir
                const defaultProfile = {
                  uid: currentUser.uid,
                  displayName: currentUser.displayName || 'Usuário',
                  fullName: currentUser.displayName || '',
                  email: currentUser.email,
                  currency: 'BRL',
                  locale: 'pt-BR',
                  monthStartDay: 1,
                  marketingOptIn: false,
                  createdAt: serverTimestamp()
                };
                await setDoc(userDocRef, defaultProfile);
                setUserProfile(defaultProfile);
              }
              setLoading(false);
            }, (error) => {
              console.error("Profile Subscription Error:", error);
              setLoading(false);
            });
          } else {
            setUserProfile(null);
            setLoading(false);
          }
        });
      } catch (e) {
        console.error("Auth Init Error:", e);
        setLoading(false);
      }
    };

    initAuth();
    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) (unsubscribeProfile as any)();
    };
  }, [isPreview]);

  return (
    <ToastProvider>
      <AuthContext.Provider value={{ user, loading, userProfile, isPreview }}>
        <Routes>
          <Route path="/login" element={(user && !isPreview) ? <Navigate to="/app/dashboard" /> : <Login />} />
          <Route path="/signup" element={(user && !isPreview) ? <Navigate to="/app/dashboard" /> : <Signup />} />
          <Route path="/print" element={<ProtectedRoute><PrintReport /></ProtectedRoute>} />
          <Route path="/diagnostics" element={<ProtectedRoute><Diagnostics /></ProtectedRoute>} />
          
          <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="analysis" element={<Analysis />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="provision" element={<Provision />} />
            <Route path="restart-plan" element={<RestartPlanPage />} />
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