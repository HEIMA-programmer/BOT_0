import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Tabs, List, Tag, Space, Empty, Button } from 'antd';
import {
  ClockCircleOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
import { roomAPI } from '../../api/index';
import { TYPE_CONFIG } from '../../utils/roomUtils';

const { Title, Text } = Typography;

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'watch', label: 'Watch Together' },
  { key: 'speaking', label: 'Speaking' },
  { key: 'game', label: 'Game' },
];

export default function MyRecords() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    roomAPI.getRecords()
      .then(res => setRecords(res.data.records || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeTab === 'all'
    ? records
    : records.filter(r => r.room_type === activeTab);

  const formatDuration = (secs) => {
    if (!secs) return '0 min';
    const m = Math.round(secs / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}min`;
  };

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
        <Empty
          description={loading ? 'Loading...' : 'No records found'}
          style={{ marginTop: 60 }}
        />
      ) : (
        <List
          dataSource={filtered}
          renderItem={record => {
            const tc = TYPE_CONFIG[record.room_type];
            if (!tc) return null;
            const dateStr = record.created_at
              ? new Date(record.created_at).toLocaleString()
              : '';
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
                      <Text strong style={{ fontSize: 15 }}>{record.room_name}</Text>
                      <Tag
                        color={tc.color}
                        style={{ borderRadius: 4, fontSize: 11, lineHeight: '18px' }}
                      >
                        {tc.label}
                      </Tag>
                    </div>
                    <Space size={12} wrap>
                      <Text type="secondary" style={{ fontSize: 12 }}>{dateStr}</Text>
                      <Space size={4}>
                        <ClockCircleOutlined style={{ fontSize: 11, color: '#9ca3af' }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {formatDuration(record.duration_secs)}
                        </Text>
                      </Space>
                    </Space>
                  </div>

                  {/* Summary */}
                  {record.summary && (
                    <div style={{ flexShrink: 0, textAlign: 'right' }}>
                      <Text style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                        {record.summary}
                      </Text>
                    </div>
                  )}
                </div>
              </List.Item>
            );
          }}
        />
      )}
    </div>
  );
}
