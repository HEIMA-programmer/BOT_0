import { Typography, Card, Row, Col, Tag } from 'antd';
import { AudioOutlined, MessageOutlined, TrophyOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const modes = [
  {
    title: 'Pronunciation Practice',
    icon: <AudioOutlined />,
    color: '#dc2626',
    bg: '#fef2f2',
    desc: 'Record your voice, play back, and compare with native pronunciation.',
    sprint: 'Sprint 2',
  },
  {
    title: 'Structured Speaking',
    icon: <MessageOutlined />,
    color: '#7c3aed',
    bg: '#f5f3ff',
    desc: 'Pick a topic card, express your thoughts in 30-60 seconds, and get AI feedback.',
    sprint: 'Sprint 3',
  },
  {
    title: 'Sentence Follow-along',
    icon: <TrophyOutlined />,
    color: '#059669',
    bg: '#ecfdf5',
    desc: 'Read sentences aloud and see how closely your speech matches the target.',
    sprint: 'Sprint 2',
  },
];

export default function Speaking() {
  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
          <AudioOutlined style={{ marginRight: 10, color: '#dc2626' }} />Speaking Studio
        </Title>
        <Text type="secondary">
          Improve pronunciation and structured academic expression.
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {modes.map((mode) => (
          <Col xs={24} sm={8} key={mode.title}>
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
                background: mode.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                color: mode.color,
                marginBottom: 16,
              }}>
                {mode.icon}
              </div>
              <Title level={5} style={{ fontWeight: 600 }}>{mode.title}</Title>
              <Tag style={{ borderRadius: 12, marginBottom: 12 }}>{mode.sprint}</Tag>
              <Text type="secondary" style={{ fontSize: 13, display: 'block' }}>
                {mode.desc}
              </Text>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
