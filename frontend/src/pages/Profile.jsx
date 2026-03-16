import { Typography, Card, Descriptions, Button } from 'antd';
import { UserOutlined } from '@ant-design/icons';

const { Title } = Typography;

export default function Profile({ user }) {
  if (!user) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Title level={3}>Please log in to view your profile</Title>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: '0 auto' }}>
      <Title level={2}><UserOutlined /> My Profile</Title>
      <Card>
        <Descriptions column={1}>
          <Descriptions.Item label="Username">{user.username}</Descriptions.Item>
          <Descriptions.Item label="Email">{user.email}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
