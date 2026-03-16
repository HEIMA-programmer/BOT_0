import { Menu, Layout, Button, Space } from 'antd';
import {
  HomeOutlined,
  ReadOutlined,
  BookOutlined,
  SoundOutlined,
  AudioOutlined,
  RobotOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';

const { Header } = Layout;

const menuItems = [
  { key: '/', icon: <HomeOutlined />, label: 'Home' },
  { key: '/daily-words', icon: <ReadOutlined />, label: 'Daily Words' },
  { key: '/word-bank', icon: <BookOutlined />, label: 'Word Bank' },
  { key: '/listening', icon: <SoundOutlined />, label: 'Listening' },
  { key: '/speaking', icon: <AudioOutlined />, label: 'Speaking' },
  { key: '/ai-chat', icon: <RobotOutlined />, label: 'AI Chat' },
  { key: '/profile', icon: <UserOutlined />, label: 'Profile' },
];

export default function NavBar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
      <div
        style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginRight: 24, cursor: 'pointer', whiteSpace: 'nowrap' }}
        onClick={() => navigate('/')}
      >
        Academic English
      </div>
      <Menu
        theme="dark"
        mode="horizontal"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ flex: 1, minWidth: 0 }}
      />
      <Space>
        {user ? (
          <>
            <span style={{ color: '#fff' }}>{user.username}</span>
            <Button type="link" style={{ color: '#fff' }} onClick={onLogout}>
              Logout
            </Button>
          </>
        ) : (
          <Button type="primary" onClick={() => navigate('/login')}>
            Login
          </Button>
        )}
      </Space>
    </Header>
  );
}
