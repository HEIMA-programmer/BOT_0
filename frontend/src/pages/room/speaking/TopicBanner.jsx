import { Typography, Button, Tag } from 'antd';

const { Text } = Typography;

export default function TopicBanner({ topic, isHost, onChangeTopic }) {
  if (topic && topic !== 'Free Talk') {
    return (
      <div style={{
        background: '#1e3a5f', padding: '10px 24px',
        display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid #1e40af', flexShrink: 0,
      }}>
        <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>Topic</Tag>
        <Text style={{ color: '#93c5fd', fontWeight: 500, flex: 1 }}>{topic}</Text>
        {isHost && (
          <Button
            size="small"
            onClick={onChangeTopic}
            style={{ background: 'transparent', borderColor: '#1e40af', color: '#60a5fa' }}
          >
            Change
          </Button>
        )}
      </div>
    );
  }

  return (
    <div style={{
      background: '#1e293b', padding: '6px 24px',
      display: 'flex', alignItems: 'center', gap: 8,
      borderBottom: '1px solid #334155', flexShrink: 0,
    }}>
      <Tag style={{ borderRadius: 6, background: '#334155', borderColor: '#475569', color: '#94a3b8' }}>Free Talk</Tag>
      {isHost && (
        <Button size="small" type="link" onClick={onChangeTopic} style={{ color: '#60a5fa', padding: 0 }}>
          Set a topic
        </Button>
      )}
    </div>
  );
}
