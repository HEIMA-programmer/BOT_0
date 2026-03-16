import { Typography, Card, Tag, Row, Col } from 'antd';
import { SoundOutlined, LockOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const levels = [
  { label: 'Beginner', color: '#059669', bg: '#ecfdf5', count: 3 },
  { label: 'Intermediate', color: '#2563eb', bg: '#eff6ff', count: 3 },
  { label: 'Advanced', color: '#d97706', bg: '#fffbeb', count: 0, locked: true },
];

export default function Listening() {
  return (
    <div className="page-container">
      <div className="page-header">
        <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
          <SoundOutlined style={{ marginRight: 10, color: '#d97706' }} />Listening Lab
        </Title>
        <Text type="secondary">
          Practice listening to academic lectures and answer comprehension questions.
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {levels.map((level) => (
          <Col xs={24} sm={8} key={level.label}>
            <Card
              hoverable={!level.locked}
              style={{
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                opacity: level.locked ? 0.6 : 1,
                height: '100%',
              }}
              bodyStyle={{ padding: 24, textAlign: 'center' }}
            >
              <div style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: level.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: 24,
                color: level.color,
              }}>
                {level.locked ? <LockOutlined /> : <SoundOutlined />}
              </div>
              <Title level={4} style={{ fontWeight: 600 }}>{level.label}</Title>
              <Tag color={level.locked ? 'default' : 'blue'} style={{ borderRadius: 12 }}>
                {level.locked ? 'Coming in Sprint 4' : `${level.count} clips available`}
              </Tag>
              <Text type="secondary" style={{ display: 'block', marginTop: 12, fontSize: 13 }}>
                {level.locked
                  ? 'Advanced content will be unlocked later'
                  : 'Coming in Sprint 2 — Listen to lecture clips and answer AI-generated questions'}
              </Text>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
