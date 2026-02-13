
import React, { createContext, useContext, useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Layout from './components/Layout.tsx';
import { UserProfile } from './types.ts';
import { isPreview } from './utils/env.ts';
import { getAuthClient } from './services/authClient.ts';
import { saveUserProfile } from './services/db.ts';
import { firebaseEnabled } from './lib/firebase.ts';
import { getAuthModule } from './lib/firebaseModules.ts';

// Loader de tela cheia para transições de rota
const FullScreenLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-screen bg-[#F4F7FE] animate-pulse">
    <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
    <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Azulando...</span>
  </div>
);

// Páginas com Lazy Loading
const Dashboard = lazy(() => import('./pages/Dashboard.tsx'));
const AccountsManager = lazy(() => import('./pages/AccountsManager.tsx'));
const Provision = lazy(() => import('./pages/Provision.tsx'));
const Profile = lazy(() => import('./pages/Profile.tsx'));
const RestartPlan = lazy(() => import('./pages/RestartPlan.tsx'));
const Login = lazy(() => import('./pages/Login.tsx'));
const Signup = lazy(() => import('./pages/Signup.tsx'));
const Analysis = lazy(() => import('./pages/Analysis.tsx'));
const Categories = lazy(() => import('./pages/Categories.tsx'));
const Goals = lazy(() => import('./pages/Goals.tsx'));

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
        if (isPreviewMode) {
          setUser({ uid: 'preview-user', email: 'demo@azular.app' });
          setLoading(false);
          return;
        }

        if (!firebaseEnabled) {
          setLoading(false);
          return;
        }

        const auth = await getAuthClient();
        const { onAuthStateChanged } = await getAuthModule();
        
        unsubscribe = onAuthStateChanged(auth, async (u: any) => {
          setUser(u);
          if (u) {
            const defaultProfile = {
              uid: u.uid,
              displayName: u.displayName || 'Usuário',
              currency: 'BRL',
              email: u.email
            };
            saveUserProfile(u.uid, defaultProfile).catch(() => {});
          }
          setLoading(false);
        });
      } catch (err: any) {
        setBootError(err);
        setLoading(false);
      }
    };

    initAuth();
    return () => unsubscribe();
  }, [isPreviewMode]);

  if (bootError) throw bootError;

  const value = { user, userProfile, loading, isPreview: isPreviewMode };

  return (
    <AuthContext.Provider value={value}>
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          <Route path="/app" element={<ProtectedRoute><Layout><Outlet /></Layout></ProtectedRoute>}>
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="contas-plano" element={<Provision />} />
            <Route path="contas" element={<AccountsManager />} />
            <Route path="restart-plan" element={<RestartPlan />} />
            <Route path="analysis" element={<Analysis />} />
            <Route path="categories" element={<Categories />} />
            <Route path="goals" element={<Goals />} />
            <Route path="profile" element={<Profile />} />
            <Route index element={<Navigate to="/app/dashboard" />} />
          </Route>

          <Route path="/" element={<Navigate to="/app/dashboard" />} />
        </Routes>
      </Suspense>
    </AuthContext.Provider>
  );
};

export default App;
