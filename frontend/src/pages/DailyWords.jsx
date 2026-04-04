import React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Typography, Card, Tag, Button, App, Tooltip, Spin, Modal, InputNumber,
  Empty, Progress, Divider, List, Space, Input, Drawer, Select, Badge
} from 'antd';
import {
  PlusOutlined, CheckOutlined, CalendarOutlined,
  BookOutlined, SettingOutlined, PlayCircleOutlined, EyeOutlined,
  ReloadOutlined, TrophyOutlined, SearchOutlined, StarOutlined,
  DeleteOutlined, ExportOutlined, SortAscendingOutlined, CloseOutlined,
  FireOutlined
} from '@ant-design/icons';
import { useLocation, useParams } from 'react-router-dom';
import { dailyLearningAPI, wordBankAPI } from '../api';
import WordPronunciationControl from '../components/WordPronunciationControl';
import useAwlExampleSentences, { highlightWordInSentence } from '../hooks/useAwlExampleSentences';
import useLearningTimeTracker from '../hooks/useLearningTimeTracker';
import useWordPronunciation from '../hooks/useWordPronunciation';
import HelpButton from '../components/HelpButton';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const DAILY_COUNT_KEY = 'dailyWordsCount';
const DEFAULT_COUNT = 10;

// Confetti colors for celebration
const CONFETTI_COLORS = ['#667eea', '#764ba2', '#f5576c', '#00f2fe', '#ffd700', '#059669', '#ff6b6b', '#48dbfb'];

// Word Bank sort options
const sortOptions = [
  { label: 'Date Added (Newest)', value: 'date_desc' },
  { label: 'Date Added (Oldest)', value: 'date_asc' },
  { label: 'Word (A-Z)', value: 'word_asc' },
  { label: 'Word (Z-A)', value: 'word_desc' },
];

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
  const [cardFlipping, setCardFlipping] = useState(false);

  const location = useLocation();
  const { count } = useParams();
  const state = location.state || {};

  useEffect(() => {
    const targetCount = count ? parseInt(count, 10) : state.count;
    if (targetCount && !isNaN(targetCount)) {
      setDailyCount(targetCount);
    }
  }, [count, state.count]);

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

  // Mastery celebration (confetti + border glow)
  const [showCelebration, setShowCelebration] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState([]);

  // ==================== Word Bank Drawer State ====================
  const [bankDrawerOpen, setBankDrawerOpen] = useState(false);
  const [bankWords, setBankWords] = useState([]);
  const [bankFilteredWords, setBankFilteredWords] = useState([]);
  const [bankSearch, setBankSearch] = useState('');
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSortBy, setBankSortBy] = useState('date_desc');
  const [bankDeleteModalVisible, setBankDeleteModalVisible] = useState(false);
  const [bankWordToDelete, setBankWordToDelete] = useState(null);
  const [bankExportModalVisible, setBankExportModalVisible] = useState(false);
  const [bankLearningOpen, setBankLearningOpen] = useState(false);
  const [bankLearningWords, setBankLearningWords] = useState([]);
  const [bankLearningIndex, setBankLearningIndex] = useState(0);
  const [bankShowDef, setBankShowDef] = useState(false);

  const { message } = App.useApp();
  const speechWarningShownRef = useRef(false);
  const {
    selectedAccent,
    setSelectedAccent,
    speak: speakWithAccent,
  } = useWordPronunciation();
  const { getExampleSentence } = useAwlExampleSentences();

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
  const handleSpeakWord = (text, accent = selectedAccent) => {
    const didSpeak = speakWithAccent(text, accent);

    if (!didSpeak && !speechWarningShownRef.current) {
      speechWarningShownRef.current = true;
      message.warning('Text-to-speech is not available in this browser.');
    }
  };

  const renderWordPronunciation = (text, options = {}) => (
    <WordPronunciationControl
      text={text}
      selectedAccent={selectedAccent}
      onAccentChange={setSelectedAccent}
      onSpeak={handleSpeakWord}
      {...options}
    />
  );

  const getWordExampleSentence = (word) => (
    word ? getExampleSentence(word.text, word.example_sentence) : ''
  );

  const renderExampleBlock = (word, labelColor) => {
    const exampleSentence = getWordExampleSentence(word);

    if (!exampleSentence) {
      return null;
    }

    return (
      <>
        <Divider style={{ margin: '12px 0' }} />
        <Text strong style={{ color: labelColor }}>Example:</Text>
        <Paragraph italic style={{ margin: '8px 0', color: '#6b7280' }}>
          &ldquo;{highlightWordInSentence(exampleSentence, word.text)}&rdquo;
        </Paragraph>
      </>
    );
  };

  const renderInlineExampleSentence = (word, style = {}, ellipsis = false) => {
    const exampleSentence = getWordExampleSentence(word);

    if (!exampleSentence) {
      return null;
    }

    return (
      <Paragraph italic style={style} ellipsis={ellipsis}>
        &ldquo;{highlightWordInSentence(exampleSentence, word.text)}&rdquo;
      </Paragraph>
    );
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

  // Celebration effect - confetti particles + border glow
  const triggerCelebration = () => {
    const particles = Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      delay: Math.random() * 0.5,
      duration: 1 + Math.random() * 1.5,
      size: 4 + Math.random() * 6,
      drift: (Math.random() - 0.5) * 60,
    }));
    setConfettiParticles(particles);
    setShowCelebration(true);
    setTimeout(() => {
      setShowCelebration(false);
      setConfettiParticles([]);
    }, 2500);
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
      triggerCelebration();
    } else if (action === 'review') {
      await updateStatus(word.id, 'review');
    }

    // Flip animation
    setCardFlipping(true);
    setTimeout(() => {
      if (learningIndex < learningWords.length - 1) {
        setLearningIndex(prev => prev + 1);
        setShowDef(false);
      } else {
        setLearningOpen(false);
        message.success('Learning session complete!');
        loadToday();
        
        if (state.taskId) {
          window.dispatchEvent(new CustomEvent('taskCompleted', { detail: { taskId: state.taskId } }));
        }
      }
      setCardFlipping(false);
    }, 300);
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
      triggerCelebration();
    }

    if (reviewIndex < reviewWords.length - 1) {
      setReviewIndex(prev => prev + 1);
      setShowReviewDef(false);
    } else {
      setReviewOpen(false);
      message.success('Review session complete!');
      loadToday();
      
      if (state.taskId) {
        window.dispatchEvent(new CustomEvent('taskCompleted', { detail: { taskId: state.taskId } }));
      }
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
      triggerCelebration();
      setAllWords(prev => prev.map(w =>
        w.id === wordId ? { ...w, progress_status: 'mastered' } : w
      ));
      setMasteredCount(prev => prev + 1);
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
      triggerCelebration();
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
      triggerCelebration();
    }
  };

  // ==================== Word Bank Drawer ====================
  const loadWordBank = async () => {
    setBankLoading(true);
    try {
      const res = await wordBankAPI.getAll();
      setBankWords(res.data.words || []);
    } catch (err) {
      message.error('Failed to load word bank');
    } finally {
      setBankLoading(false);
    }
  };

  const openBankDrawer = () => {
    loadWordBank();
    setBankDrawerOpen(true);
  };

  // Bank filtering & sorting
  useEffect(() => {
    let filtered = [...bankWords];
    if (bankSearch) {
      filtered = filtered.filter(w =>
        w.text.toLowerCase().includes(bankSearch.toLowerCase())
      );
    }
    filtered.sort((a, b) => {
      switch (bankSortBy) {
        case 'date_desc': return new Date(b.added_at) - new Date(a.added_at);
        case 'date_asc': return new Date(a.added_at) - new Date(b.added_at);
        case 'word_asc': return a.text.localeCompare(b.text);
        case 'word_desc': return b.text.localeCompare(a.text);
        default: return 0;
      }
    });
    setBankFilteredWords(filtered);
  }, [bankWords, bankSearch, bankSortBy]);

  // Keep bankIds in sync
  useEffect(() => {
    if (bankWords.length > 0) {
      setBankIds(new Set(bankWords.map(w => w.word_id)));
    }
  }, [bankWords]);

  const confirmBankRemove = (entryId) => {
    setBankWordToDelete(entryId);
    setBankDeleteModalVisible(true);
  };

  const removeBankWord = async () => {
    if (!bankWordToDelete) return;
    try {
      await wordBankAPI.remove(bankWordToDelete);
      setBankWords(bankWords.filter((w) => w.id !== bankWordToDelete));
      message.success('Word removed from bank');
    } catch (err) {
      message.error('Failed to remove word');
    } finally {
      setBankDeleteModalVisible(false);
      setBankWordToDelete(null);
    }
  };

  const exportBankWords = async (format) => {
    try {
      const exportData = bankFilteredWords;
      if (format === 'csv') {
        const csvContent = [
          ['Word', 'Definition'],
          ...exportData.map(w => [w.text, `"${(w.definition || '').replace(/"/g, '""')}"`])
        ].map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wordbank_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      } else if (format === 'json') {
        await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
        message.success('Copied to clipboard');
      } else if (format === 'text') {
        await navigator.clipboard.writeText(exportData.map(w => w.text).join('\n'));
        message.success('Copied to clipboard');
      }
      setBankExportModalVisible(false);
    } catch (err) {
      message.error('Export failed');
    }
  };

  const startBankLearning = () => {
    if (bankWords.length === 0) {
      message.info('No words in your bank!');
      return;
    }
    setBankLearningWords([...bankWords]);
    setBankLearningIndex(0);
    setBankShowDef(false);
    setBankLearningOpen(true);
  };

  const handleBankLearningNext = () => {
    if (bankLearningIndex < bankLearningWords.length - 1) {
      setBankLearningIndex(prev => prev + 1);
      setBankShowDef(false);
    } else {
      setBankLearningOpen(false);
      message.success('Finished reviewing word bank!');
    }
  };

  const handleRemoveFromBankLearning = async (entryId) => {
    try {
      await wordBankAPI.remove(entryId);
      setBankWords(prev => prev.filter(w => w.id !== entryId));

      const updated = bankLearningWords.filter(w => w.id !== entryId);
      if (updated.length === 0) {
        setBankLearningOpen(false);
        setBankLearningWords([]);
        message.success('Removed. No more words in bank.');
        return;
      }

      setBankLearningWords(updated);
      const removedIdx = bankLearningWords.findIndex(w => w.id === entryId);
      if (removedIdx < bankLearningIndex) {
        setBankLearningIndex(prev => prev - 1);
      } else if (bankLearningIndex >= updated.length) {
        setBankLearningIndex(updated.length - 1);
      }
      setBankShowDef(false);
      message.success('Removed from bank');
    } catch (err) {
      message.error('Failed to remove');
    }
  };

  // ==================== Render ====================
  const currentLearningWord = learningWords[learningIndex];
  const currentReviewWord = reviewWords[reviewIndex];
  const currentBankLearningWord = bankLearningWords[bankLearningIndex];

  // Fun: daily encouragement based on time of day
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      {/* Confetti particles - fall from top, no blocking */}
      {showCelebration && confettiParticles.map(p => (
        <div
          key={p.id}
          style={{
            position: 'fixed',
            left: `${p.x}%`,
            top: -10,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.size > 7 ? '50%' : '2px',
            zIndex: 9999,
            pointerEvents: 'none',
            animation: `confettiFall ${p.duration}s ease-in ${p.delay}s forwards`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}

      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes cardFlip {
          0% { transform: rotateY(0deg); opacity: 1; }
          50% { transform: rotateY(90deg); opacity: 0.5; }
          100% { transform: rotateY(0deg); opacity: 1; }
        }
        @keyframes borderGlow {
          0% { box-shadow: 0 0 5px rgba(102,126,234,0.3); }
          50% { box-shadow: 0 0 20px rgba(102,126,234,0.6), 0 0 40px rgba(118,75,162,0.3); }
          100% { box-shadow: 0 0 5px rgba(102,126,234,0.3); }
        }
        .word-card-flip {
          animation: cardFlip 0.3s ease-in-out;
        }
        .celebration-glow .ant-modal-content {
          animation: borderGlow 1s ease-in-out 3;
        }
        .streak-glow {
          text-shadow: 0 0 8px rgba(255,165,0,0.6);
        }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
              Vocabulary
            </Title>
            <Text type="secondary" style={{ fontSize: 14 }}>
              <CalendarOutlined style={{ marginRight: 6 }} />{date}
              <span style={{ marginLeft: 12, color: '#667eea' }}>{greeting}! Ready to learn?</span>
            </Text>
          </div>
          <Space wrap>
            <Badge count={bankIds.size} overflowCount={999} color="#059669" offset={[-4, 0]}>
              <Button
                icon={<BookOutlined />}
                onClick={openBankDrawer}
                style={{ borderColor: '#059669', color: '#059669' }}
              >
                My Word Bank
              </Button>
            </Badge>
            <Button
              icon={<SettingOutlined />}
              onClick={() => { setTempCount(dailyCount); setSettingsOpen(true); }}
            >
              {dailyCount} words/day
            </Button>
          </Space>
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
              {masteredCount >= 10 && (
                <div style={{ marginTop: 8, fontSize: 13, color: 'rgba(255,255,255,0.9)' }}>
                  <FireOutlined className="streak-glow" /> Great progress!
                </div>
              )}
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
              <Text type="secondary" style={{ fontSize: 12 }}>Word Bank</Text>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#059669' }}>{bankIds.size}</div>
              <Text type="secondary" style={{ fontSize: 12 }}>saved</Text>
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
        className={showCelebration ? 'celebration-glow' : ''}
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
            <div className={cardFlipping ? 'word-card-flip' : ''} style={{ textAlign: 'center', minHeight: 220, padding: '20px 0' }}>
              <div style={{ marginBottom: 8 }}>
                <Title level={1} style={{ margin: 0, color: '#1a1a2e', fontSize: 36 }}>
                  {currentLearningWord.text}
                </Title>
                {renderWordPronunciation(currentLearningWord.text, {
                  mode: 'learning',
                  buttonStyle: { color: '#667eea', marginTop: 4 },
                })}
              </div>

              {currentLearningWord.part_of_speech && (
                <Tag style={{ marginBottom: 12 }}>{currentLearningWord.part_of_speech}</Tag>
              )}

              {showDef ? (
                <div style={{
                  textAlign: 'left',
                  background: 'linear-gradient(135deg, #f8f9fa, #e9ecef)',
                  padding: 20,
                  borderRadius: 12,
                  marginTop: 16,
                  border: '1px solid #e9ecef',
                }}>
                  <Text strong style={{ color: '#667eea' }}>Definition:</Text>
                  <Paragraph style={{ margin: '8px 0', fontSize: 15 }}>
                    {currentLearningWord.definition}
                  </Paragraph>
                  {renderExampleBlock(currentLearningWord, '#667eea')}
                </div>
              ) : (
                <Button
                  type="dashed"
                  size="large"
                  onClick={() => setShowDef(true)}
                  style={{ marginTop: 16 }}
                >
                  Tap to Reveal Definition
                </Button>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
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
        className={showCelebration ? 'celebration-glow' : ''}
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
                {renderWordPronunciation(currentReviewWord.text, {
                  mode: 'learning',
                  buttonStyle: { color: '#f5576c', marginTop: 4 },
                })}
              </div>

              {showReviewDef ? (
                <div style={{
                  textAlign: 'left',
                  background: 'linear-gradient(135deg, #fef2f2, #fee2e2)',
                  padding: 20,
                  borderRadius: 12,
                  marginTop: 16,
                  border: '1px solid #fecaca',
                }}>
                  <Text strong style={{ color: '#f5576c' }}>Definition:</Text>
                  <Paragraph style={{ margin: '8px 0', fontSize: 15 }}>
                    {currentReviewWord.definition}
                  </Paragraph>
                  {renderExampleBlock(currentReviewWord, '#f5576c')}
                </div>
              ) : (
                <Button
                  type="dashed"
                  size="large"
                  onClick={() => setShowReviewDef(true)}
                  style={{ marginTop: 16 }}
                >
                  Tap to Reveal Definition
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
                renderWordPronunciation(word.text, {
                  key: 'sound',
                  size: 'small',
                }),
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
                      {renderWordPronunciation(word.text, {
                        size: 'small',
                      })}
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
                  renderWordPronunciation(word.text, {
                    key: 'sound',
                    size: 'small',
                  }),
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
                  renderWordPronunciation(word.text, {
                    key: 'sound',
                    size: 'small',
                  }),
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

      {/* ==================== Word Bank Drawer ==================== */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <BookOutlined style={{ color: '#059669', fontSize: 20 }} />
            <span style={{ fontWeight: 700, fontSize: 18 }}>My Word Bank</span>
            <Tag color="green" style={{ marginLeft: 8 }}>{bankWords.length} words</Tag>
          </div>
        }
        placement="right"
        width={560}
        open={bankDrawerOpen}
        onClose={() => setBankDrawerOpen(false)}
        styles={{ body: { padding: '16px 24px' } }}
      >
        {/* Bank Actions */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={startBankLearning}
            disabled={bankWords.length === 0}
            style={{ background: '#059669', borderColor: '#059669' }}
          >
            Study Bank
          </Button>
          <Button icon={<ExportOutlined />} onClick={() => setBankExportModalVisible(true)}>
            Export
          </Button>
          <Button icon={<ReloadOutlined />} onClick={loadWordBank} loading={bankLoading}>
            Refresh
          </Button>
        </div>

        {/* Bank Search & Sort */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <Input
            placeholder="Search words..."
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            value={bankSearch}
            onChange={(e) => setBankSearch(e.target.value)}
            allowClear
            style={{ flex: 1 }}
          />
          <Select value={bankSortBy} onChange={setBankSortBy} style={{ width: 180 }}>
            {sortOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>
                <SortAscendingOutlined /> {opt.label}
              </Option>
            ))}
          </Select>
        </div>

        {/* Bank Word List */}
        {bankLoading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin size="large" /></div>
        ) : bankFilteredWords.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              bankWords.length === 0
                ? 'No words saved yet. Add words during learning!'
                : 'No words match your search'
            }
          >
            {bankWords.length === 0 ? null : (
              <Button onClick={() => setBankSearch('')}>Clear Search</Button>
            )}
          </Empty>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bankFilteredWords.map((entry) => (
              <Card
                key={entry.id}
                size="small"
                style={{
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  transition: 'all 0.2s',
                }}
                hoverable
                styles={{ body: { padding: '12px 16px' } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Space size={8} align="center" wrap>
                      <Text strong style={{ fontSize: 16 }}>{entry.text}</Text>
                      {entry.difficulty_level && (
                        <Tag color={
                          entry.difficulty_level === 'beginner' ? 'green' :
                          entry.difficulty_level === 'intermediate' ? 'blue' : 'orange'
                        } style={{ borderRadius: 12 }}>
                          {entry.difficulty_level}
                        </Tag>
                      )}
                      {entry.part_of_speech && (
                        <Tag style={{ borderRadius: 12 }}>{entry.part_of_speech}</Tag>
                      )}
                    </Space>
                    <Paragraph style={{ margin: '6px 0 2px', color: '#374151', fontSize: 14 }} ellipsis={{ rows: 2 }}>
                      {entry.definition}
                    </Paragraph>
                    {renderInlineExampleSentence(
                      entry,
                      { color: '#9ca3af', fontSize: 12, margin: 0 },
                      { rows: 1 }
                    )}
                  </div>
                  <Space size={4}>
                    {renderWordPronunciation(entry.text, {
                      size: 'small',
                      buttonType: 'default',
                      buttonStyle: { color: '#059669', borderColor: '#86efac' },
                      dropdownButtonStyle: { color: '#059669', borderColor: '#86efac' },
                    })}
                    <Tooltip title="Remove">
                      <Button
                        shape="circle"
                        size="small"
                        icon={<DeleteOutlined />}
                        danger
                        onClick={() => confirmBankRemove(entry.id)}
                      />
                    </Tooltip>
                  </Space>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Drawer>

      {/* Bank Delete Confirm Modal */}
      <Modal
        title="Remove Word"
        open={bankDeleteModalVisible}
        onOk={removeBankWord}
        onCancel={() => setBankDeleteModalVisible(false)}
        okText="Remove"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to remove this word from your bank?</p>
      </Modal>

      {/* Bank Export Modal */}
      <Modal
        title="Export Word Bank"
        open={bankExportModalVisible}
        onCancel={() => setBankExportModalVisible(false)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%', padding: '10px 0' }}>
          <Button block icon={<ExportOutlined />} onClick={() => exportBankWords('csv')}>
            Export as CSV (for Excel)
          </Button>
          <Button block icon={<ExportOutlined />} onClick={() => exportBankWords('json')}>
            Export as JSON
          </Button>
          <Button block icon={<ExportOutlined />} onClick={() => exportBankWords('text')}>
            Copy as Text List
          </Button>
        </Space>
      </Modal>

      {/* Bank Learning Modal */}
      <Modal
        title={null}
        open={bankLearningOpen}
        onCancel={() => setBankLearningOpen(false)}
        footer={null}
        width={640}
        centered
        styles={{ body: { padding: '24px' } }}
      >
        {currentBankLearningWord && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary">Word Bank Study</Text>
                <Text strong>{bankLearningIndex + 1} / {bankLearningWords.length}</Text>
              </div>
              <Progress
                percent={Math.round(((bankLearningIndex + 1) / bankLearningWords.length) * 100)}
                showInfo={false}
                strokeColor={{ from: '#059669', to: '#10b981' }}
              />
            </div>

            <div style={{ textAlign: 'center', minHeight: 220, padding: '20px 0' }}>
              <Title level={1} style={{ margin: 0, color: '#1a1a2e', fontSize: 36 }}>
                {currentBankLearningWord.text}
              </Title>
              {renderWordPronunciation(currentBankLearningWord.text, {
                mode: 'learning',
                buttonStyle: { color: '#059669', marginTop: 4 },
              })}

              {bankShowDef ? (
                <div style={{
                  textAlign: 'left',
                  background: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
                  padding: 20, borderRadius: 12, marginTop: 16,
                  border: '1px solid #a7f3d0',
                }}>
                  <Text strong style={{ color: '#059669' }}>Definition:</Text>
                  <Paragraph style={{ margin: '8px 0', fontSize: 15 }}>
                    {currentBankLearningWord.definition}
                  </Paragraph>
                  {renderExampleBlock(currentBankLearningWord, '#059669')}
                </div>
              ) : (
                <Button type="dashed" size="large" onClick={() => setBankShowDef(true)} style={{ marginTop: 16 }}>
                  Tap to Reveal Definition
                </Button>
              )}
            </div>

            {/* Encouragement */}
            <div style={{ textAlign: 'center', marginTop: 8, marginBottom: 12 }}>
              <Text type="secondary" italic style={{ fontSize: 13 }}>
                {getRandomMsg(LEARN_ENCOURAGEMENTS)}
              </Text>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12, flexWrap: 'wrap' }}>
              <Button
                size="large"
                onClick={handleBankLearningNext}
                type="primary"
                style={{ minWidth: 120 }}
              >
                {bankLearningIndex < bankLearningWords.length - 1 ? 'Next Word' : 'Finish'}
              </Button>
              <Tooltip title="Remove this word from your bank">
                <Button
                  size="large"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => handleRemoveFromBankLearning(currentBankLearningWord.id)}
                  style={{ minWidth: 120 }}
                >
                  Remove from Bank
                </Button>
              </Tooltip>
            </div>
          </div>
        )}
      </Modal>
      <HelpButton guideKey="dailyWords" />
    </div>
  );
}
