import { useState, useEffect } from 'react';
import { Typography, List, Card, Button, Tag, Empty, message } from 'antd';
import { DeleteOutlined, SoundOutlined } from '@ant-design/icons';
import { mockWordBank } from '../api/mock';

const { Title, Text, Paragraph } = Typography;

const masteryLabels = ['New', 'Learning', 'Familiar', 'Mastered'];

export default function WordBank() {
  const [words, setWords] = useState([]);

  useEffect(() => {
    // TODO: Replace with real API call — wordBankAPI.getAll()
    setWords(mockWordBank.words);
  }, []);

  const removeWord = (entryId) => {
    // TODO: Replace with real API call — wordBankAPI.remove(entryId)
    setWords(words.filter((w) => w.id !== entryId));
    message.success('Word removed from bank');
  };

  const speakWord = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Title level={2}>My Word Bank</Title>
      <Text type="secondary">{words.length} words saved</Text>
      {words.length === 0 ? (
        <Empty description="No words saved yet. Add words from Daily Words!" style={{ marginTop: 48 }} />
      ) : (
        <List
          style={{ marginTop: 16 }}
          dataSource={words}
          renderItem={(entry) => (
            <Card style={{ marginBottom: 12 }} key={entry.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    {entry.text}
                    <Tag color="green" style={{ marginLeft: 8 }}>
                      {masteryLabels[entry.mastery_level] || 'New'}
                    </Tag>
                  </Title>
                  <Paragraph style={{ margin: '8px 0 0' }}>{entry.definition}</Paragraph>
                </div>
                <div>
                  <Button icon={<SoundOutlined />} onClick={() => speakWord(entry.text)} style={{ marginRight: 8 }} />
                  <Button icon={<DeleteOutlined />} danger onClick={() => removeWord(entry.id)} />
                </div>
              </div>
            </Card>
          )}
        />
      )}
    </div>
  );
}
