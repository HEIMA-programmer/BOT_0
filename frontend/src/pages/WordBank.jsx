import React from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  Typography, Card, Button, Tag, Empty, Tooltip, Input, Space, Spin,
  Modal, Select, List, Progress, Divider, App
} from 'antd';
import {
  DeleteOutlined, SearchOutlined, BookOutlined,
  ReloadOutlined, ExportOutlined, SortAscendingOutlined,
  PlayCircleOutlined, CheckOutlined, PlusOutlined, EyeOutlined,
  StarOutlined, CloseOutlined
} from '@ant-design/icons';
import { wordBankAPI, dailyLearningAPI } from '../api';
import WordPronunciationControl from '../components/WordPronunciationControl';
import useAwlExampleSentences, { highlightWordInSentence } from '../hooks/useAwlExampleSentences';
import useLearningTimeTracker from '../hooks/useLearningTimeTracker';
import useWordPronunciation from '../hooks/useWordPronunciation';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const sortOptions = [
  { label: 'Date Added (Newest)', value: 'date_desc' },
  { label: 'Date Added (Oldest)', value: 'date_asc' },
  { label: 'Word (A-Z)', value: 'word_asc' },
  { label: 'Word (Z-A)', value: 'word_desc' },
];

export default function WordBank() {
  useLearningTimeTracker('vocab', 'study_time:word-bank');

  const [words, setWords] = useState([]);
  const [filteredWords, setFilteredWords] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('date_desc');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [wordToDelete, setWordToDelete] = useState(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [selectedWords, setSelectedWords] = useState(new Set());

  // Learning modal state
  const [learningOpen, setLearningOpen] = useState(false);
  const [learningWords, setLearningWords] = useState([]);
  const [learningIndex, setLearningIndex] = useState(0);
  const [showDef, setShowDef] = useState(false);

  // Track word IDs that are in the bank for immediate button feedback
  const [bankWordIds, setBankWordIds] = useState(new Set());

  // All words / review / mastered modal state
  const [allWordsOpen, setAllWordsOpen] = useState(false);
  const [allWords, setAllWords] = useState([]);
  const [allWordsTotal, setAllWordsTotal] = useState(0);
  const [allWordsPage, setAllWordsPage] = useState(1);
  const [allWordsPerPage, setAllWordsPerPage] = useState(20);
  const [allWordsSearch, setAllWordsSearch] = useState('');
  const [allWordsLoading, setAllWordsLoading] = useState(false);

  const [reviewListOpen, setReviewListOpen] = useState(false);
  const [reviewListWords, setReviewListWords] = useState([]);
  const [reviewListLoading, setReviewListLoading] = useState(false);

  const [masteredOpen, setMasteredOpen] = useState(false);
  const [masteredWords, setMasteredWords] = useState([]);
  const [masteredLoading, setMasteredLoading] = useState(false);

  const { message } = App.useApp();
  const speechWarningShownRef = useRef(false);
  const {
    selectedAccent,
    setSelectedAccent,
    speak: speakWithAccent,
  } = useWordPronunciation();
  const { getExampleSentence } = useAwlExampleSentences();

  // ==================== Data Loading ====================
  const loadWordBank = async () => {
    setLoading(true);
    try {
      const res = await wordBankAPI.getAll();
      setWords(res.data.words || []);
    } catch (err) {
      message.error('Failed to load word bank');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWordBank();
  }, []);

  // Keep bankWordIds in sync with loaded word bank
  useEffect(() => {
    setBankWordIds(new Set(words.map(w => w.word_id)));
  }, [words]);

  // ==================== Filtering & Sorting ====================
  useEffect(() => {
    let filtered = [...words];
    if (search) {
      filtered = filtered.filter(w =>
        w.text.toLowerCase().includes(search.toLowerCase())
      );
    }
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc': return new Date(b.added_at) - new Date(a.added_at);
        case 'date_asc': return new Date(a.added_at) - new Date(b.added_at);
        case 'word_asc': return a.text.localeCompare(b.text);
        case 'word_desc': return b.text.localeCompare(a.text);
        default: return 0;
      }
    });
    setFilteredWords(filtered);
  }, [words, search, sortBy]);

  // ==================== CRUD Operations ====================
  const confirmRemove = (entryId) => {
    setWordToDelete(entryId);
    setDeleteModalVisible(true);
  };

  const removeWord = async () => {
    if (!wordToDelete) return;
    try {
      await wordBankAPI.remove(wordToDelete);
      setWords(words.filter((w) => w.id !== wordToDelete));
      message.success('Word removed from bank');
    } catch (err) {
      message.error('Failed to remove word');
    } finally {
      setDeleteModalVisible(false);
      setWordToDelete(null);
    }
  };

  const batchDelete = async () => {
    if (selectedWords.size === 0) {
      message.warning('No words selected');
      return;
    }
    Modal.confirm({
      title: 'Batch Delete',
      content: `Are you sure you want to delete ${selectedWords.size} words?`,
      okText: 'Delete',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await Promise.all(Array.from(selectedWords).map(id => wordBankAPI.remove(id)));
          setWords(words.filter(w => !selectedWords.has(w.id)));
          setSelectedWords(new Set());
          setBatchDeleteMode(false);
          message.success(`${selectedWords.size} words deleted`);
        } catch (err) {
          message.error('Failed to delete words');
        }
      }
    });
  };

  // ==================== Speech ====================
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

  // ==================== Export ====================
  const exportWords = async (format) => {
    try {
      const exportData = filteredWords;
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
      setExportModalVisible(false);
    } catch (err) {
      message.error('Export failed');
    }
  };

  // ==================== Word Bank Learning ====================
  const startLearning = () => {
    if (words.length === 0) {
      message.info('No words in your bank!');
      return;
    }
    setLearningWords([...words]);
    setLearningIndex(0);
    setShowDef(false);
    setLearningOpen(true);
  };

  const handleLearningNext = () => {
    if (learningIndex < learningWords.length - 1) {
      setLearningIndex(prev => prev + 1);
      setShowDef(false);
    } else {
      setLearningOpen(false);
      message.success('Finished reviewing word bank!');
    }
  };

  const handleRemoveFromBank = async (entryId) => {
    try {
      await wordBankAPI.remove(entryId);
      setWords(prev => prev.filter(w => w.id !== entryId));

      const updated = learningWords.filter(w => w.id !== entryId);
      if (updated.length === 0) {
        setLearningOpen(false);
        setLearningWords([]);
        message.success('Removed. No more words in bank.');
        return;
      }

      setLearningWords(updated);
      // If we removed the current or a later word, keep index; if removed earlier, decrement
      const removedIdx = learningWords.findIndex(w => w.id === entryId);
      if (removedIdx < learningIndex) {
        setLearningIndex(prev => prev - 1);
      } else if (learningIndex >= updated.length) {
        setLearningIndex(updated.length - 1);
      }
      setShowDef(false);
      message.success('Removed from bank');
    } catch (err) {
      message.error('Failed to remove');
    }
  };

  // ==================== View All / Review / Mastered ====================
  const addToBank = async (wordId) => {
    try {
      await dailyLearningAPI.addToBank(wordId);
      setBankWordIds(prev => new Set([...prev, wordId]));
      setAllWords(prev => prev.map(w => w.id === wordId ? { ...w, in_word_bank: true } : w));
      message.success('Added to Word Bank!');
    } catch (error) {
      if (error.response?.status === 409) {
        message.info('Already in Word Bank');
        setBankWordIds(prev => new Set([...prev, wordId]));
        setAllWords(prev => prev.map(w => w.id === wordId ? { ...w, in_word_bank: true } : w));
      } else {
        message.error('Failed to add to bank');
      }
    }
  };

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

  // ==================== Mark Mastered by word_id ====================
  const markMasteredByWordId = async (wordId) => {
    try {
      await dailyLearningAPI.markMastered(wordId);
      message.success('Marked as mastered');
      setAllWords(prev => prev.map(w =>
        w.id === wordId ? { ...w, progress_status: 'mastered' } : w
      ));
    } catch (error) {
      message.error('Failed to mark as mastered');
    }
  };

  // ==================== Render ====================
  const currentLearningWord = learningWords[learningIndex];

  return (
    <div className="page-container" style={{ padding: '24px' }}>
      {/* Delete Confirm Modal */}
      <Modal
        title="Remove Word"
        open={deleteModalVisible}
        onOk={removeWord}
        onCancel={() => setDeleteModalVisible(false)}
        okText="Remove"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to remove this word from your bank?</p>
      </Modal>

      {/* Export Modal */}
      <Modal
        title="Export Word Bank"
        open={exportModalVisible}
        onCancel={() => setExportModalVisible(false)}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%', padding: '10px 0' }}>
          <Button block icon={<ExportOutlined />} onClick={() => exportWords('csv')}>
            Export as CSV (for Excel)
          </Button>
          <Button block icon={<ExportOutlined />} onClick={() => exportWords('json')}>
            Export as JSON
          </Button>
          <Button block icon={<ExportOutlined />} onClick={() => exportWords('text')}>
            Copy as Text List
          </Button>
        </Space>
      </Modal>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 16, marginBottom: 16
        }}>
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
              <BookOutlined style={{ marginRight: 10, color: '#059669' }} />
              My Word Bank
            </Title>
            <Text type="secondary">{words.length} words saved</Text>
          </div>
          <Space wrap>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={startLearning}
              disabled={words.length === 0}
              style={{ background: '#667eea', borderColor: '#667eea' }}
            >
              Learn Word Bank
            </Button>
            <Button icon={<ExportOutlined />} onClick={() => setExportModalVisible(true)}>
              Export
            </Button>
            {batchDeleteMode ? (
              <>
                <Button danger onClick={batchDelete}>Delete ({selectedWords.size})</Button>
                <Button size="small" onClick={() => { setBatchDeleteMode(false); setSelectedWords(new Set()); }}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button onClick={() => setBatchDeleteMode(true)}>Batch Select</Button>
            )}
          </Space>
        </div>

        {/* View Buttons */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
          <Button icon={<EyeOutlined />} onClick={openAllWords}>
            View All Words
          </Button>
          <Button icon={<ReloadOutlined />} onClick={openReviewList}>
            View Review Words
          </Button>
          <Button icon={<StarOutlined />} onClick={openMastered}>
            View Mastered Words
          </Button>
        </div>

        {/* Search and Sort */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Input
            placeholder="Search words..."
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 300, borderRadius: 8 }}
            allowClear
          />
          <Select value={sortBy} onChange={setSortBy} style={{ width: 200 }}>
            {sortOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>
                <SortAscendingOutlined /> {opt.label}
              </Option>
            ))}
          </Select>
          <Button icon={<ReloadOutlined />} onClick={loadWordBank} loading={loading}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Word List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
        </div>
      ) : filteredWords.length === 0 ? (
        <Card style={{ borderRadius: 16, textAlign: 'center', padding: '40px 0' }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              words.length === 0
                ? 'No words saved yet. Add words from Daily Words!'
                : 'No words match your search'
            }
          >
            {words.length === 0 ? (
              <Button type="primary" href="/daily-words" size="large">
                Go to Daily Words
              </Button>
            ) : (
              <Button onClick={() => setSearch('')}>Clear Search</Button>
            )}
          </Empty>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredWords.map((entry) => (
            <Card
              key={entry.id}
              style={{
                borderRadius: 16,
                border: selectedWords.has(entry.id) ? '2px solid #2563eb' : '1px solid #e5e7eb',
                background: selectedWords.has(entry.id) ? '#eff6ff' : '#fff',
                transition: 'all 0.2s',
              }}
              styles={{ body: { padding: '16px 24px' } }}
              hoverable
            >
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                gap: 16, flexWrap: 'wrap',
              }}>
                <div style={{ flex: 1, minWidth: 250 }}>
                  {batchDeleteMode && (
                    <input
                      type="checkbox"
                      checked={selectedWords.has(entry.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedWords);
                        if (e.target.checked) newSelected.add(entry.id);
                        else newSelected.delete(entry.id);
                        setSelectedWords(newSelected);
                      }}
                      style={{ marginRight: 12 }}
                    />
                  )}
                  <Space size={12} align="center" wrap>
                    <Title level={4} style={{ margin: 0, fontWeight: 600 }}>{entry.text}</Title>
                    {entry.difficulty_level && (
                      <Tag color={
                        entry.difficulty_level === 'beginner' ? 'green' :
                        entry.difficulty_level === 'intermediate' ? 'blue' : 'orange'
                      } style={{ borderRadius: 16 }}>
                        {entry.difficulty_level}
                      </Tag>
                    )}
                    {entry.part_of_speech && (
                      <Tag style={{ borderRadius: 16 }}>{entry.part_of_speech}</Tag>
                    )}
                  </Space>
                  <Paragraph style={{ margin: '8px 0 4px', color: '#374151', fontSize: 15 }}>
                    {entry.definition}
                  </Paragraph>
                  {renderInlineExampleSentence(entry, {
                    color: '#6b7280',
                    fontSize: 14,
                    margin: '0 0 4px',
                  })}
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Added: {new Date(entry.added_at).toLocaleDateString()}
                  </Text>
                </div>
                {!batchDeleteMode && (
                  <Space size={8}>
                    {renderWordPronunciation(entry.text, {
                      size: 'small',
                      buttonType: 'default',
                      buttonStyle: { color: '#2563eb', borderColor: '#93c5fd' },
                      dropdownButtonStyle: { color: '#2563eb', borderColor: '#93c5fd' },
                    })}
                    <Tooltip title="Remove">
                      <Button
                        shape="circle"
                        icon={<DeleteOutlined />}
                        danger
                        onClick={() => confirmRemove(entry.id)}
                      />
                    </Tooltip>
                  </Space>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* ==================== Word Bank Learning Modal ==================== */}
      <Modal
        title={null}
        open={learningOpen}
        onCancel={() => setLearningOpen(false)}
        footer={null}
        width={640}
        centered
        styles={{ body: { padding: '24px' } }}
      >
        {currentLearningWord && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <Text type="secondary">Word Bank Study</Text>
                <Text strong>{learningIndex + 1} / {learningWords.length}</Text>
              </div>
              <Progress
                percent={Math.round(((learningIndex + 1) / learningWords.length) * 100)}
                showInfo={false}
                strokeColor={{ from: '#059669', to: '#10b981' }}
              />
            </div>

            <div style={{ textAlign: 'center', minHeight: 220, padding: '20px 0' }}>
              <Title level={1} style={{ margin: 0, color: '#1a1a2e', fontSize: 36 }}>
                {currentLearningWord.text}
              </Title>
              {renderWordPronunciation(currentLearningWord.text, {
                mode: 'learning',
                buttonStyle: { color: '#059669', marginTop: 4 },
              })}

              {showDef ? (
                <div style={{
                  textAlign: 'left', background: '#ecfdf5', padding: 20, borderRadius: 12, marginTop: 16
                }}>
                  <Text strong style={{ color: '#059669' }}>Definition:</Text>
                  <Paragraph style={{ margin: '8px 0', fontSize: 15 }}>
                    {currentLearningWord.definition}
                  </Paragraph>
                  {renderExampleBlock(currentLearningWord, '#059669')}
                </div>
              ) : (
                <Button type="dashed" size="large" onClick={() => setShowDef(true)} style={{ marginTop: 16 }}>
                  Show Definition
                </Button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20, flexWrap: 'wrap' }}>
              <Button
                size="large"
                onClick={handleLearningNext}
                type="primary"
                style={{ minWidth: 120 }}
              >
                {learningIndex < learningWords.length - 1 ? 'Next Word' : 'Finish'}
              </Button>
              <Tooltip title="Remove this word from your bank">
                <Button
                  size="large"
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => handleRemoveFromBank(currentLearningWord.id)}
                  style={{ minWidth: 120 }}
                >
                  Remove from Bank
                </Button>
              </Tooltip>
            </div>
          </div>
        )}
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
          onChange={(e) => { setAllWordsSearch(e.target.value); loadAllWords(1, allWordsPerPage, e.target.value); }}
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
              <List.Item actions={[
                <Button
                  key="bank"
                  type="text"
                  icon={word.in_word_bank || bankWordIds.has(word.id) ? <CheckOutlined /> : <PlusOutlined />}
                  disabled={word.in_word_bank || bankWordIds.has(word.id)}
                  onClick={() => addToBank(word.id)}
                  size="small"
                >
                  {word.in_word_bank || bankWordIds.has(word.id) ? 'In Bank' : 'Add to Bank'}
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
              ].filter(Boolean)}>
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>{word.text}</Text>
                      {renderWordPronunciation(word.text, { size: 'small' })}
                    </Space>
                  }
                  description={word.definition}
                />

              </List.Item>
            )}
          />
        </Spin>
      </Modal>

      {/* ==================== Review Words Modal ==================== */}
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
              <List.Item actions={[
                <Button
                  key="bank"
                  type="text"
                  icon={bankWordIds.has(word.word_id) ? <CheckOutlined /> : <PlusOutlined />}
                  disabled={bankWordIds.has(word.word_id)}
                  onClick={() => addToBank(word.word_id)}
                  size="small"
                >
                  {bankWordIds.has(word.word_id) ? 'In Bank' : 'Add to Bank'}
                </Button>,
              ]}>
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>{word.text}</Text>
                      {renderWordPronunciation(word.text, { size: 'small' })}
                    </Space>
                  }
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
              <List.Item actions={[
                <Button
                  key="bank"
                  type="text"
                  icon={bankWordIds.has(word.word_id) ? <CheckOutlined /> : <PlusOutlined />}
                  disabled={bankWordIds.has(word.word_id)}
                  onClick={() => addToBank(word.word_id)}
                  size="small"
                >
                  {bankWordIds.has(word.word_id) ? 'In Bank' : 'Add to Bank'}
                </Button>,
              ]}>
                <List.Item.Meta
                  title={
                    <Space>
                      <Text strong>{word.text}</Text>
                      {renderWordPronunciation(word.text, { size: 'small' })}
                    </Space>
                  }
                  description={word.definition}
                />
              </List.Item>
            )}
            locale={{ emptyText: <Empty description="No mastered words yet" /> }}
          />
        </Spin>
      </Modal>
    </div>
  );
}
