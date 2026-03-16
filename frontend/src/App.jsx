import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Layout, ConfigProvider } from 'antd';
import NavBar from './components/NavBar';
import Home from './pages/Home';
import DailyWords from './pages/DailyWords';
import WordBank from './pages/WordBank';
import Listening from './pages/Listening';
import Speaking from './pages/Speaking';
import AIChat from './pages/AIChat';
import Profile from './pages/Profile';
import Login from './pages/Login';
import Register from './pages/Register';
import { authAPI } from './api';

const { Content, Footer } = Layout;

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    authAPI.me()
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, []);

  const handleLogin = (userData) => setUser(userData);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch {
      // ignore
    }
    setUser(null);
  };

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1a73e8',
        },
      }}
    >
      <Layout style={{ minHeight: '100vh' }}>
        <NavBar user={user} onLogout={handleLogout} />
        <Content style={{ background: '#fff' }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/daily-words" element={<DailyWords />} />
            <Route path="/word-bank" element={<WordBank />} />
            <Route path="/listening" element={<Listening />} />
            <Route path="/speaking" element={<Speaking />} />
            <Route path="/ai-chat" element={<AIChat />} />
            <Route path="/profile" element={<Profile user={user} />} />
            <Route path="/login" element={<Login onLogin={handleLogin} />} />
            <Route path="/register" element={<Register onLogin={handleLogin} />} />
          </Routes>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
          Academic English Practice App &copy; 2026
        </Footer>
      </Layout>
    </ConfigProvider>
  );
}
