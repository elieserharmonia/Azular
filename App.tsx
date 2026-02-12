
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import AccountsManager from './pages/AccountsManager';
import Provision from './pages/Provision';
import Profile from './pages/Profile';
import RestartPlan from './pages/RestartPlan';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Layout from './components/Layout';
import { UserProfile } from './types';
import { isPreview } from './utils/env';
import { getAuthClient } from './services/authClient';
import { saveUserProfile } from './services/db';
import { firebaseEnabled } from './lib/firebase';

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
  const isPreviewMode = isPreview();

  useEffect(() => {
    let unsubscribe: () => void = () => {};

    const initAuth = async () => {
      console.log("[Auth] Init phase. isPreviewMode =", isPreviewMode);

      if (isPreviewMode) {
        console.log("[Auth] Preview mode detected. Setting mock user.");
        setUser({ uid: 'preview-user', email: 'demo@azular.app' });
        setLoading(false);
        return;
      }

      if (!firebaseEnabled) {
        console.warn("[Auth] Firebase not enabled and not in preview. App might be misconfigured.");
        setLoading(false);
        return;
      }

      try {
        const auth = await getAuthClient();
        unsubscribe = auth.onAuthStateChanged(async (u: any) => {
          console.log("[Auth] onAuthStateChanged user =", u?.uid || "null");
          setUser(u);
          
          if (u) {
            // Se o usuário logou, garantimos que o perfil base exista
            try {
              const defaultProfile = {
                uid: u.uid,
                displayName: u.displayName || 'Usuário',
                currency: 'BRL',
                email: u.email
              };
              // saveUserProfile no db_base_logic lida com merge
              await saveUserProfile(u.uid, defaultProfile);
            } catch (e) {
              console.warn("[Auth] Failed to auto-sync profile:", e);
            }
          }
          
          setLoading(false);
        });
      } catch (err) {
        console.error("[Auth] Setup error:", err);
        setLoading(false);
      }
    };

    initAuth();
    return () => unsubscribe();
  }, [isPreviewMode]);

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
