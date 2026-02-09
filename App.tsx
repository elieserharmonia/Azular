
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import AccountsManager from './pages/AccountsManager';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { UserProfile } from './types';
import { isPreview } from './utils/env';

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

const Layout = () => {
  return (
    <div className="app-layout">
      <Outlet />
      {/* Navigation menu would go here */}
    </div>
  );
};

const App = () => {
  const [user, setUser] = useState<any>(isPreview() ? { uid: 'preview-user' } : null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const value = {
    user,
    userProfile,
    loading,
    isPreview: isPreview()
  };

  return (
    <AuthContext.Provider value={value}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="contas" element={<AccountsManager />} />
          <Route path="profile" element={<Profile />} />
          <Route index element={<Navigate to="/app/dashboard" />} />
        </Route>
        <Route path="/" element={<Navigate to="/app/dashboard" />} />
      </Routes>
    </AuthContext.Provider>
  );
};

export default App;
