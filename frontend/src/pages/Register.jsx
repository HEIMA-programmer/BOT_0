import { Form, Input, Button, Typography, Card, message } from 'antd';
import { UserOutlined, MailOutlined, LockOutlined } from '@ant-design/icons';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../api';

const { Title } = Typography;

export default function Register({ onLogin }) {
  const navigate = useNavigate();

  const onFinish = async (values) => {
    try {
      const res = await authAPI.register(values);
      onLogin(res.data);
      message.success('Registration successful!');
      navigate('/');
    } catch (err) {
      message.error(err.response?.data?.error || 'Registration failed');
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 400, margin: '60px auto' }}>
      <Card>
        <Title level={3} style={{ textAlign: 'center' }}>Register</Title>
        <Form onFinish={onFinish} layout="vertical">
          <Form.Item name="username" rules={[{ required: true, message: 'Please enter a username' }]}>
            <Input prefix={<UserOutlined />} placeholder="Username" size="large" />
          </Form.Item>
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Please enter a valid email' }]}>
            <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Password" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              Register
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: 'center' }}>
          Already have an account? <Link to="/login">Login</Link>
        </div>
      </Card>
    </div>
  );
}
