import { Form, Input, Button, Typography, Card, message } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

const { Title } = Typography;

export default function Login({ onLogin }) {
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      const res = await authAPI.login(values);
      onLogin(res.data);
      message.success('Welcome back!');
      navigate('/');
    } catch (err) {
      message.error(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 400, margin: '60px auto' }}>
      <Card>
        <Title level={3} style={{ textAlign: 'center' }}>Login</Title>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}>
            <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Please enter your password' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              Log In
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center' }}>
          Don&apos;t have an account? <Link to="/register">Register</Link>
        </div>
      </Card>
    </div>
  );
}
