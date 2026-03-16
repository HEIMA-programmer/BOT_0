import { useState, useEffect } from 'react';
import { Typography, Card, List, Tag, Button, message } from 'antd';
import { SoundOutlined, PlusOutlined } from '@ant-design/icons';
import { mockDailyWords } from '../api/mock';

const { Title, Text, Paragraph } = Typography;

export default function DailyWords() {
  const [words, setWords] = useState([]);
  const [date, setDate] = useState('');

  useEffect(() => {
    // TODO: Replace with real API call — dailyWordsAPI.getWords()
    setWords(mockDailyWords.words);
    setDate(mockDailyWords.date);
  }, []);

  const speakWord = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const addToBank = (wordId) => {
    // TODO: Replace with real API call — wordBankAPI.add(wordId)
    message.success('Word added to your bank!');
  };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <Title level={2}>Daily Words</Title>
      <Text type="secondary">{date}</Text>
      <List
        style={{ marginTop: 16 }}
        dataSource={words}
        renderItem={(word) => (
          <Card style={{ marginBottom: 12 }} key={word.id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {word.text}
                  <Tag color="blue" style={{ marginLeft: 8 }}>{word.part_of_speech}</Tag>
                  <Tag>{word.difficulty_level}</Tag>
                </Title>
                <Paragraph style={{ margin: '8px 0 4px' }}>{word.definition}</Paragraph>
                <Text italic type="secondary">{word.example_sentence}</Text>
              </div>
              <div>
                <Button
                  icon={<SoundOutlined />}
                  onClick={() => speakWord(word.text)}
                  style={{ marginRight: 8 }}
                />
                <Button
                  icon={<PlusOutlined />}
                  type="primary"
                  onClick={() => addToBank(word.id)}
                >
                  Save
                </Button>
              </div>
            </div>
          </Card>
        )}
      />
    </div>
  );
}
