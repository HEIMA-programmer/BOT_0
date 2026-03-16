import { Typography, Card, Row, Col, Progress } from 'antd';
import {
  ReadOutlined,
  BookOutlined,
  SoundOutlined,
  AudioOutlined,
  RobotOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const { Title, Text } = Typography;

const modules = [
  {
    title: 'Daily Words',
    icon: <ReadOutlined />,
    path: '/daily-words',
    desc: 'Learn new academic vocabulary every day',
    color: '#2563eb',
    bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
  },
  {
    title: 'Word Bank',
    icon: <BookOutlined />,
    path: '/word-bank',
    desc: 'Review and manage your saved words',
    color: '#059669',
    bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
  },
  {
    title: 'Listening Lab',
    icon: <SoundOutlined />,
    path: '/listening',
    desc: 'Practice with academic lecture clips',
    color: '#d97706',
    bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
  },
  {
    title: 'Speaking Studio',
    icon: <AudioOutlined />,
    path: '/speaking',
    desc: 'Improve pronunciation and expression',
    color: '#dc2626',
    bg: 'linear-gradient(135deg, #fef2f2, #fecaca)',
  },
  {
    title: 'AI Conversation',
    icon: <RobotOutlined />,
    path: '/ai-chat',
    desc: 'Practice academic discussions with AI',
    color: '#7c3aed',
    bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      {/* Welcome banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
        borderRadius: 16,
        padding: '40px 48px',
        marginBottom: 32,
        color: '#fff',
      }}>
        <Title level={2} style={{ color: '#fff', margin: 0, fontWeight: 700, fontSize: 26 }}>
          Welcome back! Ready to practice?
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, display: 'block', marginTop: 8 }}>
          Build confidence for university lectures, seminars, and academic discussions.
        </Text>
        <Row gutter={32} style={{ marginTop: 28 }}>
          {[
            { label: 'Words Learned', value: 0, total: 50 },
            { label: 'Listening Hours', value: 0, total: 10 },
            { label: 'Speaking Sessions', value: 0, total: 20 },
          ].map((s) => (
            <Col span={8} key={s.label}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{s.label}</Text>
              <Progress
                percent={Math.round((s.value / s.total) * 100)}
                strokeColor={{ from: '#60a5fa', to: '#a78bfa' }}
                trailColor="rgba(255,255,255,0.15)"
                size="small"
                style={{ marginTop: 4 }}
              />
            </Col>
          ))}
        </Row>
      </div>

      {/* Module cards */}
      <Title level={4} style={{ marginBottom: 16, fontWeight: 600, color: '#374151' }}>
        Learning Modules
      </Title>
      <Row gutter={[16, 16]}>
        {modules.map((m) => (
          <Col xs={24} sm={12} lg={8} key={m.path}>
            <Card
              hoverable
              onClick={() => navigate(m.path)}
              style={{
                height: '100%',
                borderRadius: 12,
                border: 'none',
                overflow: 'hidden',
              }}
              bodyStyle={{ padding: 24 }}
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: m.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                color: m.color,
                marginBottom: 16,
              }}>
                {m.icon}
              </div>
              <Title level={5} style={{ margin: '0 0 8px', fontWeight: 600 }}>{m.title}</Title>
              <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>{m.desc}</Text>
              <div style={{ marginTop: 16 }}>
                <Text style={{ color: m.color, fontSize: 13, fontWeight: 600 }}>
                  Start learning <ArrowRightOutlined style={{ fontSize: 11 }} />
                </Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
