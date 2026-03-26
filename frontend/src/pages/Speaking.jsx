import { Typography, Card, Row, Col, Tag, Tabs } from 'antd';
import { AudioOutlined, MessageOutlined, TrophyOutlined, RobotOutlined, CommentOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useLearningTimeTracker from '../hooks/useLearningTimeTracker';

const { Title, Text } = Typography;

const speakingModes = [
  {
    title: 'Pronunciation Practice',
    icon: <AudioOutlined />,
    color: '#dc2626',
    bg: '#fef2f2',
    desc: 'Practice pronunciation of words and sentences with AI-powered scoring.',
    status: '',
    clickable: true,
  },
  {
    title: 'Structured Speaking',
    icon: <MessageOutlined />,
    color: '#7c3aed',
    bg: '#f5f3ff',
    desc: 'Pick a topic card, express your thoughts in 30-60 seconds, and get AI feedback.',
    status: '',
    clickable: true,
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
    desc: 'Practice natural English conversation with AI. Talk about any topic you like.',
    status: '',
    clickable: true,
  },
];

export default function Speaking() {
  useLearningTimeTracker('speaking', 'study_time:speaking');
  const navigate = useNavigate();

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
                opacity: item.status === 'Coming soon' ? 0.7 : 1,
                cursor: item.clickable ? 'pointer' : 'default',
              }}
              bodyStyle={{ padding: 24 }}
              onClick={() => {
                if (item.clickable) {
                  if (item.title === 'Structured Speaking') {
                    navigate('/speaking/structured');
                  } else if (item.title === 'Free Conversation') {
                    navigate('/speaking/free-conversation');
                  } else if (item.title === 'Pronunciation Practice') {
                    navigate('/speaking/pronunciation-practice');
                  }
                }
              }}
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
              {item.status && (
                <Tag style={{ borderRadius: 12, marginBottom: 12 }}>{item.status}</Tag>
              )}
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
