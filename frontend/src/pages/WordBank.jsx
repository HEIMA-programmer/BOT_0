import { useState, useEffect } from 'react';
import { Typography, Card, Button, Tag, Empty, message, Tooltip, Input, Space } from 'antd';
import { DeleteOutlined, SoundOutlined, SearchOutlined, BookOutlined } from '@ant-design/icons';
import { mockWordBank } from '../api/mock';

const { Title, Text, Paragraph } = Typography;

const masteryConfig = [
  { label: 'New', color: '#6b7280', bg: '#f3f4f6' },
  { label: 'Learning', color: '#d97706', bg: '#fef3c7' },
  { label: 'Familiar', color: '#2563eb', bg: '#dbeafe' },
  { label: 'Mastered', color: '#059669', bg: '#d1fae5' },
];

export default function WordBank() {
  const [words, setWords] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // TODO: Replace with real API call
    setWords(mockWordBank.words);
  }, []);

  const removeWord = (entryId) => {
    setWords(words.filter((w) => w.id !== entryId));
    message.success('Word removed from bank');
  };

  const speakWord = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  const filtered = words.filter((w) =>
    w.text.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
              <BookOutlined style={{ marginRight: 10, color: '#059669' }} />My Word Bank
            </Title>
            <Text type="secondary">{words.length} words saved</Text>
          </div>
          <Input
            placeholder="Search words..."
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240, borderRadius: 8 }}
            allowClear
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{
          background: '#fff',
          borderRadius: 16,
          padding: '80px 24px',
          textAlign: 'center',
        }}>
          <Empty
            description={
              words.length === 0
                ? 'No words saved yet. Add words from Daily Words!'
                : 'No matching words found'
            }
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((entry) => {
            const mastery = masteryConfig[entry.mastery_level] || masteryConfig[0];
            return (
              <Card
                key={entry.id}
                style={{ borderRadius: 12, border: '1px solid #e5e7eb' }}
                bodyStyle={{ padding: '16px 24px' }}
                hoverable
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <Space size={12} align="center">
                      <Title level={5} style={{ margin: 0, fontWeight: 600 }}>{entry.text}</Title>
                      <Tag style={{
                        borderRadius: 12,
                        color: mastery.color,
                        background: mastery.bg,
                        border: 'none',
                        fontWeight: 500,
                      }}>
                        {mastery.label}
                      </Tag>
                    </Space>
                    <Paragraph style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 13 }}>
                      {entry.definition}
                    </Paragraph>
                  </div>
                  <Space>
                    <Tooltip title="Listen">
                      <Button shape="circle" icon={<SoundOutlined />} onClick={() => speakWord(entry.text)} />
                    </Tooltip>
                    <Tooltip title="Remove">
                      <Button shape="circle" icon={<DeleteOutlined />} danger onClick={() => removeWord(entry.id)} />
                    </Tooltip>
                  </Space>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
