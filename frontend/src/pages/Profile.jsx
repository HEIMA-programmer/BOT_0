import { Typography, Card, Row, Col, Avatar, Statistic, Tag } from 'antd';
import {
  UserOutlined,
  BookOutlined,
  SoundOutlined,
  AudioOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

export default function Profile({ user }) {
  return (
    <div className="page-container">
      {/* Profile card */}
      <Card style={{ borderRadius: 16, border: 'none', marginBottom: 24 }} bodyStyle={{ padding: 0 }}>
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
          borderRadius: '16px 16px 0 0',
          padding: '40px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 24,
        }}>
          <Avatar size={72} style={{ backgroundColor: '#2563eb', fontSize: 28, fontWeight: 700 }}>
            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </Avatar>
          <div>
            <Title level={3} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>
              {user?.username}
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{user?.email}</Text>
            <div style={{ marginTop: 8 }}>
              <Tag color="blue" style={{ borderRadius: 12 }}>Active Learner</Tag>
            </div>
          </div>
        </div>
        <div style={{ padding: '24px 32px' }}>
          <Row gutter={24}>
            <Col span={6}>
              <Statistic title="Words Learned" value={0} prefix={<BookOutlined />} />
            </Col>
            <Col span={6}>
              <Statistic title="Listening Done" value={0} prefix={<SoundOutlined />} />
            </Col>
            <Col span={6}>
              <Statistic title="Speaking Sessions" value={0} prefix={<AudioOutlined />} />
            </Col>
            <Col span={6}>
              <Statistic title="Total Time" value="0h" prefix={<ClockCircleOutlined />} />
            </Col>
          </Row>
        </div>
      </Card>

      {/* Account info */}
      <Card
        title="Account Information"
        style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
        headStyle={{ fontWeight: 600 }}
      >
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 12 }}>Username</Text>
            <div style={{ fontWeight: 500, marginTop: 2 }}>{user?.username}</div>
          </Col>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 12 }}>Email</Text>
            <div style={{ fontWeight: 500, marginTop: 2 }}>{user?.email}</div>
          </Col>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 12 }}>Member Since</Text>
            <div style={{ fontWeight: 500, marginTop: 2 }}>
              {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
            </div>
          </Col>
          <Col span={12}>
            <Text type="secondary" style={{ fontSize: 12 }}>Status</Text>
            <div style={{ marginTop: 2 }}>
              <Tag color="green" style={{ borderRadius: 12 }}>Active</Tag>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}
