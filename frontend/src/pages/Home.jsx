import { Typography, Card, Row, Col } from 'antd';
import {
  ReadOutlined,
  BookOutlined,
  SoundOutlined,
  AudioOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Paragraph } = Typography;

const modules = [
  { title: 'Daily Words', icon: <ReadOutlined style={{ fontSize: 32 }} />, path: '/daily-words', desc: 'Learn new academic vocabulary every day' },
  { title: 'Word Bank', icon: <BookOutlined style={{ fontSize: 32 }} />, path: '/word-bank', desc: 'Review your saved words' },
  { title: 'Listening Lab', icon: <SoundOutlined style={{ fontSize: 32 }} />, path: '/listening', desc: 'Practice with lecture clips' },
  { title: 'Speaking Studio', icon: <AudioOutlined style={{ fontSize: 32 }} />, path: '/speaking', desc: 'Improve pronunciation and expression' },
  { title: 'AI Conversation', icon: <RobotOutlined style={{ fontSize: 32 }} />, path: '/ai-chat', desc: 'Practice academic discussions with AI' },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>Welcome to Academic English Practice</Title>
      <Paragraph>
        Build confidence for university lectures, seminars, and academic discussions.
        Choose a module below to get started.
      </Paragraph>
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        {modules.map((m) => (
          <Col xs={24} sm={12} md={8} key={m.path}>
            <Card
              hoverable
              onClick={() => navigate(m.path)}
              style={{ textAlign: 'center', height: '100%' }}
            >
              {m.icon}
              <Title level={4} style={{ marginTop: 12 }}>{m.title}</Title>
              <Paragraph type="secondary">{m.desc}</Paragraph>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
