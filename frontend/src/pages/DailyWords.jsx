import React from 'react';
import { useState, useEffect, useCallback } from 'react';
import {
  Typography, Card, Tag, Button, App, Tooltip, Spin, Modal, InputNumber,
  Empty, Progress, Divider, List, Space, Input
} from 'antd';
import {
  SoundOutlined, PlusOutlined, CheckOutlined, CalendarOutlined,
  BookOutlined, SettingOutlined, PlayCircleOutlined, EyeOutlined,
  ReloadOutlined, TrophyOutlined, SearchOutlined, StarOutlined
} from '@ant-design/icons';
import { dailyLearningAPI, wordBankAPI } from '../api';
import useLearningTimeTracker from '../hooks/useLearningTimeTracker';

const { Title, Text, Paragraph } = Typography;

const DAILY_COUNT_KEY = 'dailyWordsCount';
const DEFAULT_COUNT = 10;

export default function DailyWords() {
  useLearningTimeTracker('vocab', 'study_time:daily-words');

  // Main state
  const [todayWords, setTodayWords] = useState([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [masteredCount, setMasteredCount] = useState(0);
  const [totalWords, setTotalWords] = useState(0);
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [bankIds, setBankIds] = useState(new Set());

  // Settings
  const [dailyCount, setDailyCount] = useState(() => {
    const saved = localStorage.getItem(DAILY_COUNT_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_COUNT;
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempCount, setTempCount] = useState(DEFAULT_COUNT);

  // Learning modal state
  const [learningOpen, setLearningOpen] = useState(false);
  const [learningWords, setLearningWords] = useState([]);
  const [learningIndex, setLearningIndex] = useState(0);
  const [showDef, setShowDef] = useState(false);

  // Review modal state
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewWords, setReviewWords] = useState([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showReviewDef, setShowReviewDef] = useState(false);
  const [reviewCountSetting, setReviewCountSetting] = useState(0);
  const [reviewSettingOpen, setReviewSettingOpen] = useState(false);
  const [tempReviewCount, setTempReviewCount] = useState(10);

  // Preview modal
  const [previewOpen, setPreviewOpen] = useState(false);

  // All words modal
  const [allWordsOpen, setAllWordsOpen] = useState(false);
  const [allWords, setAllWords] = useState([]);
  const [allWordsTotal, setAllWordsTotal] = useState(0);
  const [allWordsPage, setAllWordsPage] = useState(1);
  const [allWordsPerPage, setAllWordsPerPage] = useState(20);
  const [allWordsSearch, setAllWordsSearch] = useState('');
  const [allWordsLoading, setAllWordsLoading] = useState(false);

  // Review words list modal
  const [reviewListOpen, setReviewListOpen] = useState(false);
  const [reviewListWords, setReviewListWords] = useState([]);
  const [reviewListLoading, setReviewListLoading] = useState(false);

  // Mastered words modal
  const [masteredOpen, setMasteredOpen] = useState(false);
  const [masteredWords, setMasteredWords] = useState([]);
  const [masteredLoading, setMasteredLoading] = useState(false);

  const { message } = App.useApp();

  // Load today's data
  const loadToday = useCallback(async () => {
    try {
      setLoading(true);
      const res = await dailyLearningAPI.getToday(dailyCount);
      const data = res.data;
      setTodayWords(data.words || []);
      setReviewCount(data.review_count || 0);
      setMasteredCount(data.mastered_count || 0);
      setTotalWords(data.total_words || 0);
      setDate(data.date || '');
    } catch (error) {
      console.error('Error loading today:', error);
      message.error('Failed to load daily words');
    } finally {
      setLoading(false);
    }
  }, [dailyCount, message]);

  useEffect(() => {
    loadToday();
  }, [loadToday]);

  // Load existing word bank IDs on mount so "Add to Bank" buttons show correct state
  useEffect(() => {
    const loadBankIds = async () => {
      try {
        const res = await wordBankAPI.getAll();
        const ids = new Set((res.data.words || []).map(w => w.word_id));
        setBankIds(ids);
      } catch (error) {
        console.error('Failed to load bank IDs:', error);
      }
    };
    loadBankIds();
  }, []);

  // Speech
  const speakWord = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Settings
  const handleSaveSettings = () => {
    const clamped = Math.max(1, Math.min(tempCount || DEFAULT_COUNT, 50));
    setDailyCount(clamped);
    localStorage.setItem(DAILY_COUNT_KEY, String(clamped));
    setSettingsOpen(false);
    message.success(`Daily words count set to ${clamped}`);
  };

  // Update word status
  const updateStatus = async (progressId, status) => {
    try {
      await dailyLearningAPI.updateWordStatus(progressId, status);
      return true;
    } catch (error) {
      console.error('Error updating status:', error);
      message.error('Failed to update word status');
      return false;
    }
  };

  // Add to bank
  const addToBank = async (wordId) => {
    try {
      await dailyLearningAPI.addToBank(wordId);
      setBankIds(prev => new Set([...prev, wordId]));
      setAllWords(prev => prev.map(w => w.id === wordId ? { ...w, in_word_bank: true } : w));
      message.success('Added to Word Bank!');
    } catch (error) {
      if (error.response?.status === 409) {
        message.info('Already in Word Bank');
        setBankIds(prev => new Set([...prev, wordId]));
        setAllWords(prev => prev.map(w => w.id === wordId ? { ...w, in_word_bank: true } : w));
      } else {
        message.error('Failed to add to bank');
      }
    }
  };

  // ==================== Learning Session ====================
  const startLearning = () => {
    if (todayWords.length === 0) {
      message.info('No words to learn today!');
      return;
    }
    setLearningWords([...todayWords]);
    setLearningIndex(0);
    setShowDef(false);
    setLearningOpen(true);
  };

  const handleLearningAction = async (action) => {
    const word = learningWords[learningIndex];
    if (!word) return;

    if (action === 'mastered') {
      await updateStatus(word.id, 'mastered');
    } else if (action === 'review') {
      await updateStatus(word.id, 'review');
    }

    // Move to next word
    if (learningIndex < learningWords.length - 1) {
      setLearningIndex(prev => prev + 1);
      setShowDef(false);
    } else {
      setLearningOpen(false);
      message.success('Learning session complete!');
      loadToday();
    }
  };

  // ==================== Review Session ====================
  const openReviewSettings = async () => {
    try {
      setReviewListLoading(true);
      const res = await dailyLearningAPI.getReviewWords();
      const words = res.data.words || [];
      setReviewListWords(words);
      setTempReviewCount(Math.min(10, words.length));
      setReviewSettingOpen(true);
    } catch (error) {
      message.error('Failed to load review words');
    } finally {
      setReviewListLoading(false);
    }
  };

  const startReview = () => {
    const count = Math.min(tempReviewCount, reviewListWords.length);
    if (count === 0) {
      message.info('No words to review!');
      return;
    }
    setReviewWords(reviewListWords.slice(0, count));
    setReviewIndex(0);
    setShowReviewDef(false);
    setReviewSettingOpen(false);
    setReviewOpen(true);
  };

  const handleReviewAction = async (action) => {
    const word = reviewWords[reviewIndex];
    if (!word) return;

    if (action === 'mastered') {
      await updateStatus(word.id, 'mastered');
    }
    // 'still_review' means keep status as review, no API call needed

    if (reviewIndex < reviewWords.length - 1) {
      setReviewIndex(prev => prev + 1);
      setShowReviewDef(false);
    } else {
      setReviewOpen(false);
      message.success('Review session complete!');
      loadToday();
    }
  };

  // ==================== All Words ====================
  const loadAllWords = async (page = 1, perPage = allWordsPerPage, search = '') => {
    try {
      setAllWordsLoading(true);
      const res = await dailyLearningAPI.getAllWords(page, perPage, search);
      setAllWords(res.data.words || []);
      setAllWordsTotal(res.data.total || 0);
      setAllWordsPage(page);
    } catch (error) {
      message.error('Failed to load words');
    } finally {
      setAllWordsLoading(false);
    }
  };

  const openAllWords = () => {
    setAllWordsSearch('');
    loadAllWords(1, allWordsPerPage, '');
    setAllWordsOpen(true);
  };

  const markMasteredByWordId = async (wordId) => {
    try {
      await dailyLearningAPI.markMastered(wordId);
      message.success('Marked as mastered');
      // Update local state
      setAllWords(prev => prev.map(w =>
        w.id === wordId ? { ...w, progress_status: 'mastered' } : w
      ));
      setMasteredCount(prev => prev + 1);
      // Also remove from today's words if it was there
      setTodayWords(prev => prev.filter(w => w.word_id !== wordId));
    } catch (error) {
      message.error('Failed to mark as mastered');
    }
  };

  // ==================== Review Words List ====================
  const openReviewList = async () => {
    try {
      setReviewListLoading(true);
      const res = await dailyLearningAPI.getReviewWords();
      setReviewListWords(res.data.words || []);
      setReviewListOpen(true);
    } catch (error) {
      message.error('Failed to load review words');
    } finally {
      setReviewListLoading(false);
    }
  };

  const markReviewAsMastered = async (progressId) => {
    const ok = await updateStatus(progressId, 'mastered');
    if (ok) {
      setReviewListWords(prev => prev.filter(w => w.id !== progressId));
      setReviewCount(prev => prev - 1);
      setMasteredCount(prev => prev + 1);
    }
  };

  // ==================== Mastered Words ====================
  const openMastered = async () => {
    try {
      setMasteredLoading(true);
      const res = await dailyLearningAPI.getMasteredWords();
      setMasteredWords(res.data.words || []);
      setMasteredOpen(true);
    } catch (error) {
      message.error('Failed to load mastered words');
    } finally {
      setMasteredLoading(false);
    }
  };

  // ==================== Preview ====================
  const handlePreviewMastered = async (progressId) => {
    const ok = await updateStatus(progressId, 'mastered');
    if (ok) {
      setTodayWords(prev => prev.filter(w => w.id !== progressId));
      message.success('Marked as mastered');
    }
  };

  // ==================== Render ====================
  const currentLearningWord = learningWords[learningIndex];
  const currentReviewWord = reviewWords[reviewIndex];

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>Daily Words</Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              <CalendarOutlined style={{ marginRight: 6 }} />{date}
            </Text>
          </div>
          <Button
            icon={<SettingOutlined />}
            onClick={() => { setTempCount(dailyCount); setSettingsOpen(true); }}
          >
            {dailyCount} words/day
          </Button>
        </div>
      </div>

      <Spin spinning={loading}>
        {/* Main Action Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 24 }}>
          {/* Start Learning Card */}
          <Card
            hoverable
            style={{
              borderRadius: 16,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              cursor: 'pointer',
            }}
            styles={{ body: { padding: '28px 24px' } }}
            onClick={startLearning}
          >
            <div style={{ color: '#fff' }}>
              <PlayCircleOutlined style={{ fontSize: 36, marginBottom: 12, display: 'block' }} />
              <Title level={3} style={{ color: '#fff', margin: '0 0 8px' }}>Start Learning</Title>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>
                {todayWords.length} words to learn today
              </Text>
              <Progress
                percent={todayWords.length === 0 ? 100 : 0}
                strokeColor="rgba(255,255,255,0.5)"
                trailColor="rgba(255,255,255,0.15)"
                showInfo={false}
                style={{ marginTop: 12 }}
              />
            </div>
          </Card>

          {/* Start Review Card */}
          <Card
            hoverable
            style={{
              borderRadius: 16,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              border: 'none',
              cursor: 'pointer',
            }}
            styles={{ body: { padding: '28px 24px' } }}
            onClick={openReviewSettings}
          >
            <div style={{ color: '#fff' }}>
              <ReloadOutlined style={{ fontSize: 36, marginBottom: 12, display: 'block' }} />
              <Title level={3} style={{ color: '#fff', margin: '0 0 8px' }}>Start Review</Title>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>
                {reviewCount} words to review
              </Text>
            </div>
          </Card>

          {/* Mastered Card */}
          <Card
            hoverable
            style={{
              borderRadius: 16,
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              border: 'none',
              cursor: 'pointer',
            }}
            styles={{ body: { padding: '28px 24px' } }}
            onClick={openMastered}
          >
            <div style={{ color: '#fff' }}>
              <TrophyOutlined style={{ fontSize: 36, marginBottom: 12, display: 'block' }} />
              <Title level={3} style={{ color: '#fff', margin: '0 0 8px' }}>Mastered</Title>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 15 }}>
                {masteredCount} words mastered
              </Text>
            </div>
          </Card>
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
          <Button icon={<EyeOutlined />} onClick={() => setPreviewOpen(true)} disabled={todayWords.length === 0}>
            Preview Today&apos;s Words
          </Button>
          <Button icon={<BookOutlined />} onClick={openAllWords}>
            View All Words ({totalWords})
          </Button>
          <Button icon={<ReloadOutlined />} onClick={openReviewList}>
            View Review Words ({reviewCount})
          </Button>
        </div>

        {/* Stats Bar */}
        <Card style={{ borderRadius: 12, marginBottom: 24 }} styles={{ body: { padding: '16px 24px' } }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Today</Text>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#667eea' }}>{todayWords.length}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>to learn</Text>
            </div>
            <Divider type="vertical" style={{ height: 60 }} />
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Review</Text>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#f5576c' }}>{reviewCount}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>pending</Text>
            </div>
            <Divider type="vertical" style={{ height: 60 }} />
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Mastered</Text>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#00c9a7' }}>{masteredCount}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>words</Text>
            </div>
            <Divider type="vertical" style={{ height: 60 }} />
            <div>
              <Text type="secondary" style={{ fontSize: 12 }}>Total Pool</Text>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#6c757d' }}>{totalWords}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>words</Text>
            </div>
          </div>
        </Card>
      </Spin>

      {/* ==================== Learning Modal ==================== */}
      <Modal
        title={null}
        open={learningOpen}
        onCancel={() => { setLearningOpen(false); loadToday(); }}
        footer={null}
        width={640}
        centered
        closable
        styles={{ body: { padding: '24px' } }}
      >
        {currentLearningWord && (
          <div>
            {/* Progress */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary">Learning Progress</Text>
                <Text strong>{learningIndex + 1} / {learningWords.length}</Text>
              </div>
              <Progress
                percent={Math.round(((learningIndex + 1) / learningWords.length) * 100)}
                showInfo={false}
                strokeColor={{ from: '#667eea', to: '#764ba2' }}
              />
            </div>

            {/* Word Display */}
            <div style={{ textAlign: 'center', minHeight: 220, padding: '20px 0' }}>
              <div style={{ marginBottom: 8 }}>
                <Title level={1} style={{ margin: 0, color: '#1a1a2e', fontSize: 36 }}>
                  {currentLearningWord.text}
                </Title>
                <Button
                  type="text"
                  icon={<SoundOutlined />}
                  onClick={() => speakWord(currentLearningWord.text)}
                  style={{ color: '#667eea', marginTop: 4 }}
                >
                  Listen
                </Button>
              </div>

              {currentLearningWord.part_of_speech && (
                <Tag style={{ marginBottom: 12 }}>{currentLearningWord.part_of_speech}</Tag>
              )}

              {showDef ? (
                <div style={{
                  textAlign: 'left',
                  background: '#f8f9fa',
                  padding: 20,
                  borderRadius: 12,
                  marginTop: 16,
                }}>
                  <Text strong style={{ color: '#667eea' }}>Definition:</Text>
                  <Paragraph style={{ margin: '8px 0', fontSize: 15 }}>
                    {currentLearningWord.definition}
                  </Paragraph>
                  {currentLearningWord.example_sentence && (
                    <>
                      <Divider style={{ margin: '12px 0' }} />
                      <Text strong style={{ color: '#667eea' }}>Example:</Text>
                      <Paragraph italic style={{ margin: '8px 0', color: '#6b7280' }}>
                        &ldquo;{currentLearningWord.example_sentence}&rdquo;
                      </Paragraph>
                    </>
                  )}
                </div>
              ) : (
                <Button
                  type="dashed"
                  size="large"
                  onClick={() => setShowDef(true)}
                  style={{ marginTop: 16 }}
                >
                  Show Definition
                </Button>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
              <Button
                size="large"
                type="primary"
                style={{ background: '#059669', borderColor: '#059669', minWidth: 140 }}
                icon={<CheckOutlined />}
                onClick={() => handleLearningAction('mastered')}
              >
                I&apos;ve Mastered
              </Button>
              <Button
                size="large"
                icon={<ReloadOutlined />}
                onClick={() => handleLearningAction('review')}
                style={{ minWidth: 140 }}
              >
                Review Later
              </Button>
              <Tooltip title={bankIds.has(currentLearningWord.word_id) ? 'Already in bank' : 'Add to Word Bank'}>
                <Button
                  size="large"
                  icon={bankIds.has(currentLearningWord.word_id) ? <CheckOutlined /> : <PlusOutlined />}
                  disabled={bankIds.has(currentLearningWord.word_id)}
                  onClick={() => addToBank(currentLearningWord.word_id)}
                  style={{ minWidth: 140 }}
                >
                  {bankIds.has(currentLearningWord.word_id) ? 'In Bank' : 'Add to Bank'}
                </Button>
              </Tooltip>
            </div>
          </div>
        )}
      </Modal>

      {/* ==================== Review Settings Modal ==================== */}
      <Modal
        title="Review Settings"
        open={reviewSettingOpen}
        onCancel={() => setReviewSettingOpen(false)}
        onOk={startReview}
        okText="Start Review"
        okButtonProps={{ disabled: reviewListWords.length === 0 }}
      >
        <div style={{ padding: '16px 0' }}>
          {reviewListWords.length === 0 ? (
            <Empty description="No words to review" />
          ) : (
            <>
              <Text>Total review words: <Text strong>{reviewListWords.length}</Text></Text>
              <div style={{ marginTop: 16 }}>
                <Text>How many words to review today:</Text>
                <div style={{ marginTop: 8 }}>
                  <InputNumber
                    min={1}
                    max={reviewListWords.length}
                    value={tempReviewCount}
                    onChange={(val) => setTempReviewCount(val)}
                    style={{ width: 120 }}
                  />
                  <Text type="secondary" style={{ marginLeft: 12 }}>
                    (1 - {reviewListWords.length})
                  </Text>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* ==================== Review Session Modal ==================== */}
      <Modal
        title={null}
        open={reviewOpen}
        onCancel={() => { setReviewOpen(false); loadToday(); }}
        footer={null}
        width={640}
        centered
        closable
        styles={{ body: { padding: '24px' } }}
      >
        {currentReviewWord && (
          <div>
            {/* Progress */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary">Review Progress</Text>
                <Text strong>{reviewIndex + 1} / {reviewWords.length}</Text>
              </div>
              <Progress
                percent={Math.round(((reviewIndex + 1) / reviewWords.length) * 100)}
                showInfo={false}
                strokeColor={{ from: '#f093fb', to: '#f5576c' }}
              />
            </div>

            {/* Word Display */}
            <div style={{ textAlign: 'center', minHeight: 220, padding: '20px 0' }}>
              <div style={{ marginBottom: 8 }}>
                <Title level={1} style={{ margin: 0, color: '#1a1a2e', fontSize: 36 }}>
                  {currentReviewWord.text}
                </Title>
                <Button
                  type="text"
                  icon={<SoundOutlined />}
                  onClick={() => speakWord(currentReviewWord.text)}
                  style={{ color: '#f5576c', marginTop: 4 }}
                >
                  Listen
                </Button>
              </div>

              {showReviewDef ? (
                <div style={{
                  textAlign: 'left',
                  background: '#fef2f2',
                  padding: 20,
                  borderRadius: 12,
                  marginTop: 16,
                }}>
                  <Text strong style={{ color: '#f5576c' }}>Definition:</Text>
                  <Paragraph style={{ margin: '8px 0', fontSize: 15 }}>
                    {currentReviewWord.definition}
                  </Paragraph>
                  {currentReviewWord.example_sentence && (
                    <>
                      <Divider style={{ margin: '12px 0' }} />
                      <Text strong style={{ color: '#f5576c' }}>Example:</Text>
                      <Paragraph italic style={{ margin: '8px 0', color: '#6b7280' }}>
                        &ldquo;{currentReviewWord.example_sentence}&rdquo;
                      </Paragraph>
                    </>
                  )}
                </div>
              ) : (
                <Button
                  type="dashed"
                  size="large"
                  onClick={() => setShowReviewDef(true)}
                  style={{ marginTop: 16 }}
                >
                  Show Definition
                </Button>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
              <Button
                size="large"
                type="primary"
                style={{ background: '#059669', borderColor: '#059669', minWidth: 140 }}
                icon={<CheckOutlined />}
                onClick={() => handleReviewAction('mastered')}
              >
                I&apos;ve Mastered
              </Button>
              <Button
                size="large"
                icon={<ReloadOutlined />}
                onClick={() => handleReviewAction('still_review')}
                style={{ minWidth: 140 }}
              >
                Still Need Review
              </Button>
              <Tooltip title={bankIds.has(currentReviewWord.word_id) ? 'Already in bank' : 'Add to Word Bank'}>
                <Button
                  size="large"
                  icon={bankIds.has(currentReviewWord.word_id) ? <CheckOutlined /> : <PlusOutlined />}
                  disabled={bankIds.has(currentReviewWord.word_id)}
                  onClick={() => addToBank(currentReviewWord.word_id)}
                  style={{ minWidth: 140 }}
                >
                  {bankIds.has(currentReviewWord.word_id) ? 'In Bank' : 'Add to Bank'}
                </Button>
              </Tooltip>
            </div>
          </div>
        )}
      </Modal>

      {/* ==================== Preview Today's Words Modal ==================== */}
      <Modal
        title={`Today's Words (${todayWords.length})`}
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={null}
        width={700}
      >
        <List
          dataSource={todayWords}
          renderItem={(word) => (
            <List.Item
              actions={[
                <Button
                  key="sound"
                  type="text"
                  icon={<SoundOutlined />}
                  onClick={() => speakWord(word.text)}
                />,
                <Button
                  key="bank"
                  type="text"
                  icon={bankIds.has(word.word_id) ? <CheckOutlined /> : <PlusOutlined />}
                  disabled={bankIds.has(word.word_id)}
                  onClick={() => addToBank(word.word_id)}
                >
                  {bankIds.has(word.word_id) ? 'In Bank' : 'Add'}
                </Button>,
                <Button
                  key="mastered"
                  type="text"
                  icon={<StarOutlined />}
                  onClick={() => handlePreviewMastered(word.id)}
                  style={{ color: '#059669' }}
                >
                  Mastered
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={<Text strong style={{ fontSize: 16 }}>{word.text}</Text>}
                description={word.definition}
              />
            </List.Item>
          )}
          locale={{ emptyText: <Empty description="No words for today" /> }}
        />
      </Modal>

      {/* ==================== All Words Modal ==================== */}
      <Modal
        title={`All Words (${allWordsTotal})`}
        open={allWordsOpen}
        onCancel={() => setAllWordsOpen(false)}
        footer={null}
        width={750}
      >
        <Input
          placeholder="Search words..."
          prefix={<SearchOutlined />}
          value={allWordsSearch}
          onChange={(e) => {
            setAllWordsSearch(e.target.value);
            loadAllWords(1, allWordsPerPage, e.target.value);
          }}
          allowClear
          style={{ marginBottom: 16 }}
        />
        <Spin spinning={allWordsLoading}>
          <List
            dataSource={allWords}
            pagination={{
              current: allWordsPage,
              total: allWordsTotal,
              pageSize: allWordsPerPage,
              showSizeChanger: true,
              pageSizeOptions: [10, 20, 50, 100],
              onChange: (page, pageSize) => {
                if (pageSize !== allWordsPerPage) {
                  setAllWordsPerPage(pageSize);
                  loadAllWords(1, pageSize, allWordsSearch);
                } else {
                  loadAllWords(page, pageSize, allWordsSearch);
                }
              },
              size: 'small',
            }}
            renderItem={(word) => (
              <List.Item
                actions={[
                  <Button
                    key="bank"
                    type="text"
                    icon={word.in_word_bank || bankIds.has(word.id) ? <CheckOutlined /> : <PlusOutlined />}
                    disabled={word.in_word_bank || bankIds.has(word.id)}
                    onClick={() => addToBank(word.id)}
                    size="small"
                  >
                    {word.in_word_bank || bankIds.has(word.id) ? 'In Bank' : 'Add to Bank'}
                  </Button>,
                  word.progress_status === 'mastered' ? (
                    <Tag key="status" color="green">mastered</Tag>
                  ) : (
                    <Button
                      key="mastered"
                      type="text"
                      icon={<StarOutlined />}
                      onClick={() => markMasteredByWordId(word.id)}
                      size="small"
                      style={{ color: '#059669' }}
                    >
                      Mastered
                    </Button>
                  ),
                  word.progress_status && word.progress_status !== 'mastered' && (
                    <Tag key="status" color={
                      word.progress_status === 'review' ? 'orange' : 'blue'
                    }>
                      {word.progress_status}
                    </Tag>
                  ),
                ].filter(Boolean)}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>{word.text}</Text>
                      <Button type="text" size="small" icon={<SoundOutlined />} onClick={() => speakWord(word.text)} />
                    </Space>
                  }
                  description={word.definition}
                />
              </List.Item>
            )}
          />
        </Spin>
      </Modal>

      {/* ==================== Review Words List Modal ==================== */}
      <Modal
        title={`Review Words (${reviewListWords.length})`}
        open={reviewListOpen}
        onCancel={() => setReviewListOpen(false)}
        footer={null}
        width={700}
      >
        <Spin spinning={reviewListLoading}>
          <List
            dataSource={reviewListWords}
            pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100], size: 'small' }}
            renderItem={(word) => (
              <List.Item
                actions={[
                  <Button
                    key="sound"
                    type="text"
                    icon={<SoundOutlined />}
                    onClick={() => speakWord(word.text)}
                  />,
                  <Button
                    key="bank"
                    type="text"
                    icon={bankIds.has(word.word_id) ? <CheckOutlined /> : <PlusOutlined />}
                    disabled={bankIds.has(word.word_id)}
                    onClick={() => addToBank(word.word_id)}
                  >
                    {bankIds.has(word.word_id) ? 'In Bank' : 'Add'}
                  </Button>,
                  <Button
                    key="mastered"
                    type="text"
                    icon={<StarOutlined />}
                    onClick={() => markReviewAsMastered(word.id)}
                    style={{ color: '#059669' }}
                  >
                    Mastered
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={<Text strong style={{ fontSize: 16 }}>{word.text}</Text>}
                  description={word.definition}
                />
              </List.Item>
            )}
            locale={{ emptyText: <Empty description="No review words" /> }}
          />
        </Spin>
      </Modal>

      {/* ==================== Mastered Words Modal ==================== */}
      <Modal
        title={`Mastered Words (${masteredWords.length})`}
        open={masteredOpen}
        onCancel={() => setMasteredOpen(false)}
        footer={null}
        width={700}
      >
        <Spin spinning={masteredLoading}>
          <List
            dataSource={masteredWords}
            pagination={{ pageSize: 20, showSizeChanger: true, pageSizeOptions: [10, 20, 50, 100], size: 'small' }}
            renderItem={(word) => (
              <List.Item
                actions={[
                  <Button
                    key="sound"
                    type="text"
                    icon={<SoundOutlined />}
                    onClick={() => speakWord(word.text)}
                  />,
                  <Button
                    key="bank"
                    type="text"
                    icon={bankIds.has(word.word_id) ? <CheckOutlined /> : <PlusOutlined />}
                    disabled={bankIds.has(word.word_id)}
                    onClick={() => addToBank(word.word_id)}
                  >
                    {bankIds.has(word.word_id) ? 'In Bank' : 'Add to Bank'}
                  </Button>,
                ]}
              >
                <List.Item.Meta
                  title={<Text strong style={{ fontSize: 16 }}>{word.text}</Text>}
                  description={word.definition}
                />
              </List.Item>
            )}
            locale={{ emptyText: <Empty description="No mastered words yet" /> }}
          />
        </Spin>
      </Modal>

      {/* ==================== Settings Modal ==================== */}
      <Modal
        title="Daily Words Settings"
        open={settingsOpen}
        onOk={handleSaveSettings}
        onCancel={() => setSettingsOpen(false)}
        okText="Save"
      >
        <div style={{ padding: '16px 0' }}>
          <Text>Number of new words per day:</Text>
          <div style={{ marginTop: 12 }}>
            <InputNumber
              min={1}
              max={50}
              value={tempCount}
              onChange={(val) => setTempCount(val)}
              style={{ width: 120 }}
            />
            <Text type="secondary" style={{ marginLeft: 12 }}>(1 - 50)</Text>
          </div>
          <div style={{ marginTop: 12 }}>
            <Text type="secondary">
              Unfinished words from previous days will carry over automatically.
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  );
}
