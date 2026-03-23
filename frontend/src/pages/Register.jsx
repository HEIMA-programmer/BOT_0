import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';
import AuthMascotPanel from '../components/AuthMascotPanel';

const { Title, Text } = Typography;

export default function Register({ onLogin }) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
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
      username: values.username.trim(),
      email: values.email.trim().toLowerCase(),
      password: values.password,
    };

    try {
      setSubmitting(true);
      const res = await authAPI.register(payload);
      onLogin(res.data);
      message.success('Registration successful!');
      navigate('/');
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Registration failed';
      console.error('Registration failed:', err);
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const stackedLayout = viewportWidth < 1100;
  const passwordActive = passwordFocused || confirmFocused;

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
        heading="Start Your Journey"
        description="Create your account to build stronger academic vocabulary, improve lecture listening, and practice confident English for seminars and discussions."
        stats={[
          { num: '7', label: 'Animated Guides' },
          { num: '50+', label: 'Lecture Clips' },
          { num: 'AI', label: 'Conversation Practice' },
        ]}
        emailFocused={emailFocused}
        passwordActive={passwordActive}
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
          <Title level={2} style={{ marginBottom: 4, fontWeight: 700 }}>Create account</Title>
          <Text type="secondary" style={{ fontSize: 15 }}>Get started with Academic English Practice</Text>
          <Form onFinish={onFinish} layout="vertical" style={{ marginTop: 32 }} size="large">
            <Form.Item
              name="username"
              label="Username"
              rules={[
                { required: true, message: 'Please enter a username' },
                { min: 3, message: 'At least 3 characters' },
                { max: 80, message: 'At most 80 characters' },
              ]}
            >
              <Input prefix={<UserOutlined style={{ color: '#9ca3af' }} />} placeholder="Choose a username" />
            </Form.Item>
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
              rules={[{ required: true, min: 8, message: 'At least 8 characters' }]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                placeholder="Create a password"
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="Confirm Password"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                placeholder="Repeat your password"
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
              />
            </Form.Item>
            <div style={{ marginTop: -6, marginBottom: 20, color: '#6b7280', fontSize: 13 }}>
              {passwordActive
                ? 'All seven guides put on sunglasses while you set your password.'
                : 'Create one account to access daily words, listening practice, speaking tasks, and AI chat.'}
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
                Create Account
              </Button>
            </Form.Item>
          </Form>
          <div style={{ textAlign: 'center', color: '#6b7280' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ fontWeight: 600 }}>Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
