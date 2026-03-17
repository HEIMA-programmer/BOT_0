import { useState } from 'react';
import { Form, Input, Button, Typography, App } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../api';

const { Title, Text } = Typography;

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const { message } = App.useApp();

  const onFinish = async (values) => {
    const payload = {
      email: values.email.trim().toLowerCase(),
      password: values.password,
    };

    try {
      setSubmitting(true);
      const res = await authAPI.login(payload);
      onLogin(res.data);
      message.success('Welcome back!');
      // Navigate to the previous location or home
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Login failed';
      console.error('Login failed:', err);
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    }}>
      {/* Left: branding */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 80px',
        color: '#fff',
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
          borderRadius: 16,
          width: 56,
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 28,
          fontWeight: 700,
          marginBottom: 32,
        }}>
          A
        </div>
        <Title level={1} style={{ color: '#fff', fontSize: 40, fontWeight: 700, marginBottom: 16, lineHeight: 1.2 }}>
          Academic English Practice
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 17, lineHeight: 1.7, maxWidth: 440 }}>
          Build confidence for university lectures, seminars, and academic discussions.
          Practice vocabulary, listening, speaking, and AI-powered conversations.
        </Text>
        <div style={{ marginTop: 48, display: 'flex', gap: 32 }}>
          {[
            { num: '500+', label: 'Academic Words' },
            { num: '50+', label: 'Lecture Clips' },
            { num: 'AI', label: 'Conversation' },
          ].map((s) => (
            <div key={s.label}>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#60a5fa' }}>{s.num}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: form */}
      <div style={{
        width: 480,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fff',
        borderRadius: '24px 0 0 24px',
      }}>
        <div style={{ width: 360, padding: '40px 0' }}>
          <Title level={2} style={{ marginBottom: 4, fontWeight: 700 }}>Welcome back</Title>
          <Text type="secondary" style={{ fontSize: 15 }}>Sign in to continue your learning journey</Text>
          <Form onFinish={onFinish} layout="vertical" style={{ marginTop: 32 }} size="large">
            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}
            >
              <Input prefix={<MailOutlined style={{ color: '#9ca3af' }} />} placeholder="you@example.com" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="Enter password" />
            </Form.Item>
            <Form.Item style={{ marginTop: 8 }}>
              <Button type="primary" htmlType="submit" block size="large" style={{
                height: 48,
                fontWeight: 600,
                fontSize: 16,
                borderRadius: 10,
              }} loading={submitting}>
                Sign In
              </Button>
            </Form.Item>
          </Form>
          <div style={{ textAlign: 'center', color: '#6b7280' }}>
            Don&apos;t have an account?{' '}
            <Link to="/register" style={{ fontWeight: 600 }}>Create one</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
