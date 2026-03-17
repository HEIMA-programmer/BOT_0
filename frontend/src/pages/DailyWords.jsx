import { useState, useEffect } from 'react';
import { Typography, Card, Tag, Button, App, Tooltip, Badge, Spin } from 'antd'; //add App and Spin
import { SoundOutlined, PlusOutlined, CheckOutlined, CalendarOutlined } from '@ant-design/icons';
import { wordBankAPI } from '../api'; //change the api
import { parseAWL, getDailyWords } from '../utils/awlUtils';

const { Title, Text, Paragraph } = Typography;

export default function DailyWords() {
  const [words, setWords] = useState([]);
  const [date, setDate] = useState('');
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const { message } = App.useApp();

  useEffect(() => {
    const fetchDailyWords = async () => {
      try {
        setLoading(true);
        console.log('Loading AWL words...');
        const allWords = await parseAWL();
        console.log('Parsed AWL words:', allWords.length);
        
        const today = new Date();
        const dailyWords = getDailyWords(allWords, today);
        console.log('Daily words:', dailyWords);
        
        setWords(dailyWords);
        setDate(today.toISOString().split('T')[0]);
      } catch (error) {
        console.error('Error loading AWL words:', error);
        message.error('Failed to load daily words');
        setWords([]);
        setDate('');
      } finally {
        setLoading(false);
      }
    };

    fetchDailyWords();
  }, [message]);

  const speakWord = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const addToBank = async (word) => {
    try {
      await wordBankAPI.add({
        word_text: word.text,
        definition: word.definition,
        part_of_speech: word.part_of_speech,
        difficulty_level: word.difficulty_level,
        example_sentence: word.example_sentence,
      });
      setSavedIds((prev) => new Set([...prev, word.text]));
      message.success('Word added to your bank!');
    } catch (error) {
      console.error('Error adding word to bank:', error);
      if (error.response && error.response.status === 409) {
        message.error('Word already in your bank');
      } else {
        message.error('Failed to add word to bank');
      }
    }
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
          <Badge count={(words || []).length} style={{ backgroundColor: '#2563eb' }}>
            <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px', borderRadius: 20 }}>
              Today&apos;s Words
            </Tag>
          </Badge>
        </div>
      </div>

      <Spin spinning={loading} description="Loading daily words...">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(words || []).map((word, index) => (
            <Card
              key={word.id}
              style={{
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                transition: 'all 0.2s',
              }}
              styles={{ body: { padding: '20px 24px' } }}
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
                  <Tooltip title={savedIds.has(word.text) ? 'Saved' : 'Save to bank'}>
                    <Button
                      shape="circle"
                      type={savedIds.has(word.text) ? 'primary' : 'default'}
                      icon={savedIds.has(word.text) ? <CheckOutlined /> : <PlusOutlined />}
                      onClick={() => addToBank(word)}
                      disabled={savedIds.has(word.text)}
                      style={!savedIds.has(word.text) ? { color: '#059669', borderColor: '#6ee7b7' } : {}}
                    />
                  </Tooltip>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Spin>
    </div>
  );
}
