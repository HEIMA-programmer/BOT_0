import { Typography, Card, Row, Col, Tag } from 'antd';
import { RobotOutlined, TeamOutlined, CommentOutlined } from '@ant-design/icons';
import useLearningTimeTracker from '../hooks/useLearningTimeTracker';

const { Title, Text } = Typography;

const scenarios = [
  {
    title: 'Office Hours',
    icon: <CommentOutlined />,
    color: '#2563eb',
    bg: '#eff6ff',
    desc: 'Practice asking your professor for help, clarifying assignment requirements, and discussing grades.',
    status: 'Coming soon',
  },
  {
    title: 'Seminar Discussion',
    icon: <TeamOutlined />,
    color: '#7c3aed',
    bg: '#f5f3ff',
    desc: 'Participate in academic group discussions, express agreement/disagreement, and build on ideas.',
    status: 'Coming soon',
  },
  {
    title: 'Free Conversation',
    icon: <RobotOutlined />,
    color: '#059669',
    bg: '#ecfdf5',
    desc: 'Choose any topic and practice open-ended academic conversation with AI.',
    status: 'Coming soon',
  },
];

export default function AIChat() {
  useLearningTimeTracker('chat', 'study_time:ai-chat');

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
          <RobotOutlined style={{ marginRight: 10, color: '#7c3aed' }} />AI Conversation
        </Title>
        <Text type="secondary">
          Practice academic discussions in guided scenarios with AI feedback.
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {scenarios.map((s) => (
          <Col xs={24} sm={8} key={s.title}>
            <Card
              style={{
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                height: '100%',
                opacity: 0.7,
              }}
              bodyStyle={{ padding: 24 }}
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: s.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                color: s.color,
                marginBottom: 16,
              }}>
                {s.icon}
              </div>
              <Title level={5} style={{ fontWeight: 600 }}>{s.title}</Title>
              <Tag style={{ borderRadius: 12, marginBottom: 12 }}>{s.status}</Tag>
              <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                {s.desc}
              </Text>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
