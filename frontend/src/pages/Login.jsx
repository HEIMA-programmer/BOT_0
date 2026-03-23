import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Typography, App } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { authAPI } from '../api';
import AuthMascotPanel from '../components/AuthMascotPanel';

const { Title, Text } = Typography;

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = App.useApp();

  const [submitting, setSubmitting] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(() => (
    typeof window === 'undefined' ? 1280 : window.innerWidth
  ));

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const stackedLayout = viewportWidth < 1100;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: stackedLayout ? 'column' : 'row',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      }}
    >
      <AuthMascotPanel
        heading="Academic English Practice"
        description="Sign in to continue your learning journey with guided vocabulary, lecture listening, speaking practice, and AI-based academic conversation."
        stats={[
          { num: '7', label: 'Animated Guides' },
          { num: '500+', label: 'Academic Words' },
          { num: 'AI', label: 'Practice Modes' },
        ]}
        emailFocused={emailFocused}
        passwordActive={passwordFocused}
        stackedLayout={stackedLayout}
      />

      <div
        style={{
          width: stackedLayout ? '100%' : 480,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff',
          borderRadius: stackedLayout ? '28px 28px 0 0' : '28px 0 0 28px',
          padding: stackedLayout ? '28px 20px 36px' : '0 24px',
          boxShadow: stackedLayout ? '0 -14px 40px rgba(15,23,42,0.18)' : 'none',
        }}
      >
        <div style={{ width: '100%', maxWidth: 360, padding: '40px 0' }}>
          <Title level={2} style={{ marginBottom: 4, fontWeight: 700 }}>Welcome back</Title>
          <Text type="secondary" style={{ fontSize: 15 }}>Sign in to continue your learning journey</Text>
          <Form onFinish={onFinish} layout="vertical" style={{ marginTop: 32 }} size="large">
            <Form.Item
              name="email"
              label="Email"
              rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
                placeholder="you@example.com"
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
              />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                placeholder="Enter password"
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
            </Form.Item>
            <div style={{ marginTop: -6, marginBottom: 20, color: '#6b7280', fontSize: 13 }}>
              {passwordFocused
                ? 'All seven guides put on sunglasses while you type your password.'
                : 'Use the same account you created for vocabulary, listening, and speaking practice.'}
            </div>
            <Form.Item style={{ marginTop: 8 }}>
              <Button
                type="primary"
                htmlType="submit"
                block
                size="large"
                style={{
                  height: 48,
                  fontWeight: 600,
                  fontSize: 16,
                  borderRadius: 10,
                }}
                loading={submitting}
              >
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
