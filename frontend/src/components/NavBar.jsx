import { Menu, Layout, Button, Space, Avatar, Dropdown } from 'antd';
import {
  HomeOutlined,
  ReadOutlined,
  BookOutlined,
  SoundOutlined,
  AudioOutlined,
  RobotOutlined,
  UserOutlined,
  LogoutOutlined,
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
];

export default function NavBar({ user, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();

  const userMenuItems = [
    { key: 'profile', icon: <UserOutlined />, label: 'Profile', onClick: () => navigate('/profile') },
    { type: 'divider' },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Logout', danger: true, onClick: onLogout },
  ];

  return (
    <Header style={{
      display: 'flex',
      alignItems: 'center',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    }}>
      <div
        style={{
          color: '#fff',
          fontSize: 17,
          fontWeight: 700,
          marginRight: 32,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          letterSpacing: '-0.3px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
        onClick={() => navigate('/')}
      >
        <span style={{
          background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
          borderRadius: 8,
          width: 32,
          height: 32,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
        }}>
          A
        </span>
        Academic English
      </div>
      <Menu
        theme="dark"
        mode="horizontal"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
        style={{ flex: 1, minWidth: 0, background: 'transparent', borderBottom: 'none' }}
      />
      <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
        <Space style={{ cursor: 'pointer' }}>
          <Avatar
            size={34}
            style={{ backgroundColor: '#2563eb', fontWeight: 600 }}
          >
            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <span style={{ color: '#e5e7eb', fontSize: 14 }}>{user?.username}</span>
        </Space>
      </Dropdown>
    </Header>
  );
}
