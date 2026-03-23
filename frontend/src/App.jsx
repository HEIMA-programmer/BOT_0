import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout, ConfigProvider, Spin, App as AntdApp } from 'antd';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import DailyWords from './pages/DailyWords';
import WordBank from './pages/WordBank';
import Listening from './pages/Listening';
import Speaking from './pages/Speaking';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import { authAPI } from './api';
import './App.css';

const { Content } = Layout;

function RequireAuth({ user, loading, children }) {
  const location = useLocation();
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authAPI.me()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const handleLogin = (userData) => setUser(userData);

  const handleLogout = async () => {
    try { await authAPI.logout(); } catch { /* ignore */ }
    setUser(null);
  };

  const theme = {
    token: {
      colorPrimary: '#2563eb',
      borderRadius: 8,
      colorBgContainer: '#ffffff',
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    },
    components: {
      Layout: {
        headerBg: '#1a1a2e',
        headerHeight: 56,
      },
      Menu: {
        darkItemBg: '#1a1a2e',
        darkItemSelectedBg: 'rgba(255,255,255,0.12)',
      },
      Card: {
        boxShadowTertiary: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      },
    },
  };

  return (
    <ConfigProvider theme={theme}>
      <AntdApp>
        <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
          {user && <NavBar user={user} onLogout={handleLogout} />}
          <Content style={{ background: '#f0f2f5' }}>
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={
                user ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
              } />
              <Route path="/register" element={
                user ? <Navigate to="/" replace /> : <Register onLogin={handleLogin} />
              } />

              {/* Protected routes */}
              <Route path="/" element={
                <RequireAuth user={user} loading={loading}><Home /></RequireAuth>
              } />
              <Route path="/daily-words" element={
                <RequireAuth user={user} loading={loading}><DailyWords /></RequireAuth>
              } />
              <Route path="/word-bank" element={
                <RequireAuth user={user} loading={loading}><WordBank /></RequireAuth>
              } />
              <Route path="/listening" element={
                <RequireAuth user={user} loading={loading}><Listening user={user} /></RequireAuth>
              } />
              <Route path="/listening/:levelId" element={
                <RequireAuth user={user} loading={loading}><Listening user={user} /></RequireAuth>
              } />
              <Route path="/speaking" element={
                <RequireAuth user={user} loading={loading}><Speaking /></RequireAuth>
              } />
              <Route path="/profile" element={
                <RequireAuth user={user} loading={loading}><Profile user={user} /></RequireAuth>
              } />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Content>
        </Layout>
      </AntdApp>
    </ConfigProvider>
  );
}
