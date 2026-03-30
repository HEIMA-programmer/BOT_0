import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Tabs, List, Avatar, Tag, Space, Empty, Button } from 'antd';
import {
  PlayCircleOutlined, VideoCameraOutlined, TrophyOutlined,
  ClockCircleOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

const TYPE_CONFIG = {
  watch: { label: 'Watch Together', color: '#2563eb', bg: '#dbeafe', Icon: PlayCircleOutlined },
  speaking: { label: 'Speaking Room', color: '#16a34a', bg: '#dcfce7', Icon: VideoCameraOutlined },
  game: { label: 'Game Room', color: '#ea580c', bg: '#ffedd5', Icon: TrophyOutlined },
};

const MOCK_RECORDS = [
  {
    id: 'r1', type: 'game', name: 'Word Duel Battle', date: '2026-03-29 18:42',
    duration: '12 min', participants: ['Alice', 'Bob', 'You'],
    summary: 'Won · 5 rounds · 1st place',
  },
  {
    id: 'r2', type: 'speaking', name: "Alice's Speaking Room", date: '2026-03-28 20:15',
    duration: '23 min', participants: ['Alice', 'You'],
    summary: 'Topic: Daily Campus Life',
  },
  {
    id: 'r3', type: 'watch', name: 'Study Together', date: '2026-03-27 16:30',
    duration: '20 min', participants: ['Carol', 'David', 'You'],
    summary: 'Academic Vocabulary Basics',
  },
  {
    id: 'r4', type: 'game', name: 'Vocab Challenge', date: '2026-03-26 14:00',
    duration: '18 min', participants: ['Eve', 'You'],
    summary: 'Context Guesser · 2nd place · 6/8 correct',
  },
  {
    id: 'r5', type: 'speaking', name: 'English Practice', date: '2026-03-25 19:10',
    duration: '34 min', participants: ['Frank', 'Grace', 'You'],
    summary: 'Topic: Academic Writing',
  },
  {
    id: 'r6', type: 'watch', name: 'Listening Club', date: '2026-03-24 21:00',
    duration: '45 min', participants: ['Alice', 'You'],
    summary: 'IELTS Listening Practice Set 3',
  },
];

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'watch', label: 'Watch Together' },
  { key: 'speaking', label: 'Speaking' },
  { key: 'game', label: 'Game' },
];

const AVATAR_COLORS = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#db2777', '#0891b2'];
function getAvatarColor(username = '') {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash += username.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export default function MyRecords({ user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');

  const filtered = activeTab === 'all'
    ? MOCK_RECORDS
    : MOCK_RECORDS.filter(r => r.type === activeTab);

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={() => navigate('/room')}
          style={{ color: '#6b7280' }}
        />
        <div>
          <Title level={2} style={{ margin: 0 }}>My Records</Title>
          <Text type="secondary">Your room activity history</Text>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={TABS.map(t => ({ key: t.key, label: t.label }))}
        style={{ marginBottom: 4 }}
      />

      {/* Record List */}
      {filtered.length === 0 ? (
        <Empty description="No records found" style={{ marginTop: 60 }} />
      ) : (
        <List
          dataSource={filtered}
          renderItem={record => {
            const tc = TYPE_CONFIG[record.type];
            return (
              <List.Item
                style={{
                  background: '#fff', borderRadius: 12, marginBottom: 12,
                  padding: '16px 20px', border: '1px solid #e5e7eb',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
                  {/* Type Icon */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, background: tc.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <tc.Icon style={{ fontSize: 20, color: tc.color }} />
                  </div>

                  {/* Main Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <Text strong style={{ fontSize: 15 }}>{record.name}</Text>
                      <Tag
                        color={tc.color}
                        style={{ borderRadius: 4, fontSize: 11, lineHeight: '18px' }}
                      >
                        {tc.label}
                      </Tag>
                    </div>
                    <Space size={12} wrap>
                      <Text type="secondary" style={{ fontSize: 12 }}>{record.date}</Text>
                      <Space size={4}>
                        <ClockCircleOutlined style={{ fontSize: 11, color: '#9ca3af' }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>{record.duration}</Text>
                      </Space>
                      <div style={{ display: 'flex', gap: -6 }}>
                        {record.participants.slice(0, 4).map((p, i) => (
                          <Avatar
                            key={p}
                            size={18}
                            style={{
                              background: getAvatarColor(p), fontSize: 9, fontWeight: 700,
                              marginLeft: i > 0 ? -5 : 0,
                              border: '1.5px solid #fff',
                            }}
                          >
                            {p.charAt(0).toUpperCase()}
                          </Avatar>
                        ))}
                        {record.participants.length > 4 && (
                          <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                            +{record.participants.length - 4}
                          </Text>
                        )}
                      </div>
                    </Space>
                  </div>

                  {/* Summary */}
                  <div style={{ flexShrink: 0, textAlign: 'right' }}>
                    <Text style={{
                      fontSize: 13, fontWeight: 500,
                      color: record.summary.startsWith('Won') ? '#16a34a' : '#374151',
                    }}>
                      {record.summary}
                    </Text>
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );
}
