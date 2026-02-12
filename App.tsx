import React, { createContext, useContext, useState, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Dashboard from './pages/Dashboard.tsx';
import AccountsManager from './pages/AccountsManager.tsx';
import Provision from './pages/Provision.tsx';
import Profile from './pages/Profile.tsx';
import RestartPlan from './pages/RestartPlan.tsx';
import Login from './pages/Login.tsx';
import Signup from './pages/Signup.tsx';
import Layout from './components/Layout.tsx';
import { UserProfile } from './types.ts';
import { isPreview } from './utils/env.ts';
import { getAuthClient } from './services/authClient.ts';
import { saveUserProfile } from './services/db.ts';
import { firebaseEnabled } from './lib/firebase.ts';

interface AuthContextType {
  user: any;
  userProfile: UserProfile | null;
  loading: boolean;
  isPreview: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading, isPreview: isPre } = useAuth();
  if (loading) return null;
  if (!user && !isPre) return <Navigate to="/login" />;
  return <>{children}</>;
};

const App = () => {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState<Error | null>(null);
  const isPreviewMode = isPreview();

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    const initAuth = async () => {
      try {
        console.log("[Auth] Booting system. isPreviewMode =", isPreviewMode);

        if (isPreviewMode) {
          setUser({ uid: 'preview-user', email: 'demo@azular.app' });
          setLoading(false);
          return;
        }

        if (!firebaseEnabled) {
          console.warn("[Auth] Firebase disabled.");
          setLoading(false);
          return;
        }

        const auth = await getAuthClient();
        
        unsubscribe = auth.onAuthStateChanged(async (u: any) => {
          try {
            console.log("[Auth] State changed:", u?.uid || "null");
            setUser(u);
            
            if (u) {
              const defaultProfile = {
                uid: u.uid,
                displayName: u.displayName || 'Usuário',
                currency: 'BRL',
                email: u.email
              };
              
              saveUserProfile(u.uid, defaultProfile).catch(e => {
                console.warn("[Auth] Falha não crítica ao sincronizar perfil:", e);
              });
            }
          } catch (e) {
            console.error("[Auth] Erro no processamento do usuário logado:", e);
          } finally {
            setLoading(false);
          }
        });
      } catch (err: any) {
        console.error("[Auth] Falha fatal no boot do sistema:", err);
        setBootError(err);
        setLoading(false);
      }
    };

    initAuth();
    return () => unsubscribe();
  }, [isPreviewMode]);

  if (bootError) {
    throw bootError;
  }

  const value = {
    user,
    userProfile,
    loading,
    isPreview: isPreviewMode
  };

  return (
    <AuthContext.Provider value={value}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        <Route path="/app" element={<ProtectedRoute><Layout><Outlet /></Layout></ProtectedRoute>}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="contas-plano" element={<Provision />} />
          <Route path="contas" element={<AccountsManager />} />
          <Route path="restart-plan" element={<RestartPlan />} />
          <Route path="profile" element={<Profile />} />
          <Route index element={<Navigate to="/app/dashboard" />} />
        </Route>

        <Route path="/" element={<Navigate to="/app/dashboard" />} />
      </Routes>
    </AuthContext.Provider>
  );
};

export default App;