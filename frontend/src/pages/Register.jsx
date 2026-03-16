import { useState } from 'react';
import { Form, Input, Button, Typography, message } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

const { Title, Text } = Typography;

export default function Register({ onLogin }) {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

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
          Start Your Journey
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 17, lineHeight: 1.7, maxWidth: 440 }}>
          Join thousands of students preparing for academic success.
          Master the language of lectures, seminars, and scholarly discussions.
        </Text>
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
              <Input prefix={<MailOutlined style={{ color: '#9ca3af' }} />} placeholder="you@example.com" />
            </Form.Item>
            <Form.Item
              name="password"
              label="Password"
              rules={[{ required: true, min: 8, message: 'At least 8 characters' }]}
            >
              <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="Create a password" />
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
              <Input.Password prefix={<LockOutlined style={{ color: '#9ca3af' }} />} placeholder="Repeat your password" />
            </Form.Item>
            <Form.Item style={{ marginTop: 8 }}>
              <Button type="primary" htmlType="submit" block size="large" style={{
                height: 48,
                fontWeight: 600,
                fontSize: 16,
                borderRadius: 10,
              }} loading={submitting}>
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
