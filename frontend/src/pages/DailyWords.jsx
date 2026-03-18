import { useState, useEffect, useCallback } from 'react';
import { Typography, Card, Tag, Button, App, Tooltip, Badge, Spin, Modal, InputNumber, Table } from 'antd';
import { SoundOutlined, PlusOutlined, CheckOutlined, CalendarOutlined, BookOutlined, SettingOutlined } from '@ant-design/icons';
import { wordBankAPI } from '../api';
import { parseAWL, getDailyWords } from '../utils/awlUtils';

const { Title, Text, Paragraph } = Typography;

const DAILY_COUNT_KEY = 'dailyWordsCount';
const DEFAULT_COUNT = 8;

export default function DailyWords() {
  const [words, setWords] = useState([]);
  const [allWords, setAllWords] = useState([]);
  const [date, setDate] = useState('');
  const [savedIds, setSavedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [allWordsModalOpen, setAllWordsModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [dailyCount, setDailyCount] = useState(() => {
    const saved = localStorage.getItem(DAILY_COUNT_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_COUNT;
  });
  const [tempCount, setTempCount] = useState(dailyCount);
  const { message } = App.useApp();

  const refreshDailyWords = useCallback((all, count) => {
    const today = new Date();
    setWords(getDailyWords(all, today, count));
    setDate(today.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    const fetchDailyWords = async () => {
      try {
        setLoading(true);
        const parsed = await parseAWL();
        setAllWords(parsed);
        refreshDailyWords(parsed, dailyCount);
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
  }, [message, dailyCount, refreshDailyWords]);

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

  const handleSaveSettings = () => {
    const clamped = Math.max(1, Math.min(tempCount || DEFAULT_COUNT, allWords.length || 50));
    setDailyCount(clamped);
    localStorage.setItem(DAILY_COUNT_KEY, String(clamped));
    setSettingsModalOpen(false);
    message.success(`Daily words count set to ${clamped}`);
  };

  const difficultyColor = {
    beginner: 'green',
    intermediate: 'blue',
    advanced: 'orange',
  };

  const allWordsColumns = [
    {
      title: '#',
      dataIndex: 'id',
      key: 'id',
      width: 60,
    },
    {
      title: 'Word',
      dataIndex: 'text',
      key: 'text',
      width: 160,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Definition',
      dataIndex: 'definition',
      key: 'definition',
    },
  ];

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tooltip title="View All Words">
              <Button
                icon={<BookOutlined />}
                onClick={() => setAllWordsModalOpen(true)}
              >
                All Words ({allWords.length})
              </Button>
            </Tooltip>
            <Tooltip title="Settings">
              <Button
                icon={<SettingOutlined />}
                onClick={() => { setTempCount(dailyCount); setSettingsModalOpen(true); }}
              >
                {dailyCount}/day
              </Button>
            </Tooltip>
            <Badge count={(words || []).length} style={{ backgroundColor: '#2563eb' }}>
              <Tag color="blue" style={{ fontSize: 14, padding: '4px 12px', borderRadius: 20 }}>
                Today&apos;s Words
              </Tag>
            </Badge>
          </div>
        </div>
      </div>

      <Spin spinning={loading} tip="Loading daily words...">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(words || []).map((word, index) => (
            <Card
              key={word.text}
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
                    {word.part_of_speech && (
                      <Tag style={{ borderRadius: 12 }}>{word.part_of_speech}</Tag>
                    )}
                    <Tag color={difficultyColor[word.difficulty_level]} style={{ borderRadius: 12 }}>
                      {word.difficulty_level}
                    </Tag>
                  </div>
                  <Paragraph style={{ margin: '0 0 6px', paddingLeft: 40, color: '#374151', fontSize: 14 }}>
                    {word.definition}
                  </Paragraph>
                  {word.example_sentence && (
                    <Text italic style={{ paddingLeft: 40, color: '#6b7280', fontSize: 13 }}>
                      &ldquo;{word.example_sentence}&rdquo;
                    </Text>
                  )}
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

      <Modal
        title={`All AWL Words (${allWords.length})`}
        open={allWordsModalOpen}
        onCancel={() => setAllWordsModalOpen(false)}
        footer={null}
        width={700}
      >
        <Table
          dataSource={allWords}
          columns={allWordsColumns}
          rowKey="id"
          size="small"
          pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: ['20', '50', '100'] }}
          scroll={{ y: 500 }}
        />
      </Modal>

      <Modal
        title="Daily Words Settings"
        open={settingsModalOpen}
        onOk={handleSaveSettings}
        onCancel={() => setSettingsModalOpen(false)}
        okText="Save"
      >
        <div style={{ padding: '16px 0' }}>
          <Text>Number of words per day:</Text>
          <div style={{ marginTop: 12 }}>
            <InputNumber
              min={1}
              max={allWords.length || 50}
              value={tempCount}
              onChange={(val) => setTempCount(val)}
              style={{ width: 120 }}
            />
            <Text type="secondary" style={{ marginLeft: 12 }}>
              (1 - {allWords.length || 50})
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  );
}
