import { Typography, Card, Row, Col, Tag, Tabs } from 'antd';
import { AudioOutlined, MessageOutlined, TrophyOutlined, RobotOutlined, CommentOutlined, TeamOutlined } from '@ant-design/icons';
import useLearningTimeTracker from '../hooks/useLearningTimeTracker';

const { Title, Text } = Typography;

const speakingModes = [
  {
    title: 'Pronunciation Practice',
    icon: <AudioOutlined />,
    color: '#dc2626',
    bg: '#fef2f2',
    desc: 'Record your voice, play back, and compare with native pronunciation.',
    status: 'Coming soon',
  },
  {
    title: 'Structured Speaking',
    icon: <MessageOutlined />,
    color: '#7c3aed',
    bg: '#f5f3ff',
    desc: 'Pick a topic card, express your thoughts in 30-60 seconds, and get AI feedback.',
    status: 'Coming soon',
  },
  {
    title: 'Sentence Follow-along',
    icon: <TrophyOutlined />,
    color: '#059669',
    bg: '#ecfdf5',
    desc: 'Read sentences aloud and see how closely your speech matches the target.',
    status: 'Coming soon',
  },
];

const aiChatScenarios = [
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

export default function Speaking() {
  useLearningTimeTracker('speaking', 'study_time:speaking');

  function renderCards(items) {
    return (
      <Row gutter={[16, 16]}>
        {items.map((item) => (
          <Col xs={24} sm={8} key={item.title}>
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
                background: item.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                color: item.color,
                marginBottom: 16,
              }}>
                {item.icon}
              </div>
              <Title level={5} style={{ fontWeight: 600 }}>{item.title}</Title>
              <Tag style={{ borderRadius: 12, marginBottom: 12 }}>{item.status}</Tag>
              <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                {item.desc}
              </Text>
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  const tabItems = [
    {
      key: 'speaking',
      label: 'Speaking Practice',
      children: renderCards(speakingModes),
    },
    {
      key: 'ai-chat',
      label: 'AI Conversation',
      children: renderCards(aiChatScenarios),
    },
  ];

  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
          <AudioOutlined style={{ marginRight: 10, color: '#dc2626' }} />Speaking Studio
        </Title>
        <Text type="secondary">
          Improve pronunciation, structured academic expression, and AI-powered conversation.
        </Text>
      </div>

      <Tabs
        defaultActiveKey="speaking"
        items={tabItems}
        style={{ marginTop: 24 }}
      />
    </div>
  );
}
