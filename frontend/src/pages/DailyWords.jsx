import { useState, useEffect } from 'react';
import { Typography, Card, Tag, Button, message, Tooltip, Badge } from 'antd';
import { SoundOutlined, PlusOutlined, CheckOutlined, CalendarOutlined } from '@ant-design/icons';
import { mockDailyWords } from '../api/mock';

const { Title, Text, Paragraph } = Typography;

export default function DailyWords() {
  const [words, setWords] = useState([]);
  const [date, setDate] = useState('');
  const [savedIds, setSavedIds] = useState(new Set());

  useEffect(() => {
    // TODO: Replace with real API call
    setWords(mockDailyWords.words);
    setDate(mockDailyWords.date);
  }, []);

  const speakWord = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const addToBank = (wordId) => {
    // TODO: Replace with real API call
    setSavedIds((prev) => new Set([...prev, wordId]));
    message.success('Word added to your bank!');
  };

  const difficultyColor = {
    beginner: 'green',
    intermediate: 'blue',
    advanced: 'orange',
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>Daily Words</Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              <CalendarOutlined style={{ marginRight: 6 }} />{date}
            </Text>
          </div>
          <Badge count={words.length} style={{ backgroundColor: '#2563eb' }}>
            <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px', borderRadius: 20 }}>
              Today&apos;s Words
            </Tag>
          </Badge>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {words.map((word, index) => (
          <Card
            key={word.id}
            style={{
              borderRadius: 12,
              border: '1px solid #e5e7eb',
              transition: 'all 0.2s',
            }}
            bodyStyle={{ padding: '20px 24px' }}
            hoverable
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                  <span style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: '#eff6ff',
                    color: '#2563eb',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 13,
                    fontWeight: 700,
                  }}>
                    {index + 1}
                  </span>
                  <Title level={4} style={{ margin: 0, fontWeight: 600 }}>{word.text}</Title>
                  <Tag style={{ borderRadius: 12 }}>{word.part_of_speech}</Tag>
                  <Tag color={difficultyColor[word.difficulty_level]} style={{ borderRadius: 12 }}>
                    {word.difficulty_level}
                  </Tag>
                </div>
                <Paragraph style={{ margin: '0 0 6px', paddingLeft: 40, color: '#374151', fontSize: 14 }}>
                  {word.definition}
                </Paragraph>
                <Text italic style={{ paddingLeft: 40, color: '#6b7280', fontSize: 13 }}>
                  &ldquo;{word.example_sentence}&rdquo;
                </Text>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <Tooltip title="Listen">
                  <Button
                    shape="circle"
                    icon={<SoundOutlined />}
                    onClick={() => speakWord(word.text)}
                    style={{ color: '#2563eb', borderColor: '#93c5fd' }}
                  />
                </Tooltip>
                <Tooltip title={savedIds.has(word.id) ? 'Saved' : 'Save to bank'}>
                  <Button
                    shape="circle"
                    type={savedIds.has(word.id) ? 'primary' : 'default'}
                    icon={savedIds.has(word.id) ? <CheckOutlined /> : <PlusOutlined />}
                    onClick={() => addToBank(word.id)}
                    disabled={savedIds.has(word.id)}
                    style={!savedIds.has(word.id) ? { color: '#059669', borderColor: '#6ee7b7' } : {}}
                  />
                </Tooltip>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
