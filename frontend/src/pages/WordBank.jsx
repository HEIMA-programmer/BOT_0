// frontend/src/pages/WordBank.jsx
import { useState, useEffect } from 'react';
import { 
  Typography, 
  Card, 
  Button, 
  Tag, 
  Empty, 
  message, 
  Tooltip, 
  Input, 
  Space,
  Spin,
  Modal,
  Select,
  Row,
  Col,
  Statistic,
  Progress,
  Divider,
  Alert
} from 'antd';
import { 
  DeleteOutlined, 
  SoundOutlined, 
  SearchOutlined, 
  BookOutlined,
  ReloadOutlined,
  BarChartOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  StarOutlined,
  ExportOutlined,
  FilterOutlined,
  SortAscendingOutlined
} from '@ant-design/icons';
import { wordBankAPI } from '../api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// 掌握程度配置
const masteryConfig = [
  { label: 'New', color: '#6b7280', bg: '#f3f4f6', value: 0, emoji: '🆕' },
  { label: 'Learning', color: '#d97706', bg: '#fef3c7', value: 1, emoji: '📚' },
  { label: 'Familiar', color: '#2563eb', bg: '#dbeafe', value: 2, emoji: '✨' },
  { label: 'Mastered', color: '#059669', bg: '#d1fae5', value: 3, emoji: '🌟' },
];

// 排序选项
const sortOptions = [
  { label: 'Date Added (Newest)', value: 'date_desc' },
  { label: 'Date Added (Oldest)', value: 'date_asc' },
  { label: 'Word (A-Z)', value: 'word_asc' },
  { label: 'Word (Z-A)', value: 'word_desc' },
  { label: 'Mastery Level', value: 'mastery' },
];

export default function WordBank() {
  // ==================== State Management ====================
  const [words, setWords] = useState([]);
  const [filteredWords, setFilteredWords] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [masteryFilter, setMasteryFilter] = useState(null);
  const [sortBy, setSortBy] = useState('date_desc');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [wordToDelete, setWordToDelete] = useState(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reviewWords, setReviewWords] = useState([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [showDefinition, setShowDefinition] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [batchDeleteMode, setBatchDeleteMode] = useState(false);
  const [selectedWords, setSelectedWords] = useState(new Set());
  const [reviewHistory, setReviewHistory] = useState([]);
  const [dailyGoal, setDailyGoal] = useState(10);
  const [todayReviewed, setTodayReviewed] = useState(0);

  // ==================== Data Loading ====================
  const loadWordBank = async () => {
    setLoading(true);
    try {
      const res = await wordBankAPI.getAll();
      setWords(res.data.words || []);
      
      // 加载今日复习数量
      const reviewRes = await wordBankAPI.getTodayReviewCount();
      setTodayReviewed(reviewRes.data.count || 0);
      
      // 加载复习历史（用于统计）
      const historyRes = await wordBankAPI.getReviewHistory();
      setReviewHistory(historyRes.data.history || []);
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

  // ==================== Filtering & Sorting ====================
  useEffect(() => {
    let filtered = [...words];
    
    // 搜索过滤
    if (search) {
      filtered = filtered.filter(w => 
        w.text.toLowerCase().includes(search.toLowerCase()) ||
        w.definition.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // 掌握程度过滤
    if (masteryFilter !== null) {
      filtered = filtered.filter(w => w.mastery_level === masteryFilter);
    }
    
    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date_desc':
          return new Date(b.added_at) - new Date(a.added_at);
        case 'date_asc':
          return new Date(a.added_at) - new Date(b.added_at);
        case 'word_asc':
          return a.text.localeCompare(b.text);
        case 'word_desc':
          return b.text.localeCompare(a.text);
        case 'mastery':
          return b.mastery_level - a.mastery_level;
        default:
          return 0;
      }
    });
    
    setFilteredWords(filtered);
  }, [words, search, masteryFilter, sortBy]);

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
      console.error(err);
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
          await wordBankAPI.batchDelete(Array.from(selectedWords));
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

  // ==================== Review Functions ====================
  const startReview = async () => {
    try {
      const res = await wordBankAPI.getReviewWords();
      setReviewWords(res.data.words || []);
      setReviewModalVisible(true);
      setCurrentReviewIndex(0);
      setShowDefinition(false);
    } catch (err) {
      message.error('Failed to load review words');
      console.error(err);
    }
  };

  const markReviewed = async (wordId, knewIt) => {
    try {
      await wordBankAPI.recordReview(wordId, knewIt);
      
      // 更新掌握程度（如果用户知道这个词，提升掌握度）
      if (knewIt) {
        setWords(words.map(w => {
          if (w.id === wordId && w.mastery_level < 3) {
            return { ...w, mastery_level: w.mastery_level + 1 };
          }
          return w;
        }));
      }
      
      setTodayReviewed(prev => prev + 1);
    } catch (err) {
      console.error('Failed to record review:', err);
    }
  };

  // ==================== Mastery Update ====================
  const updateMastery = async (entryId, newLevel) => {
    try {
      await wordBankAPI.updateMastery(entryId, newLevel);
      setWords(words.map(w => 
        w.id === entryId ? { ...w, mastery_level: newLevel } : w
      ));
      message.success('Mastery level updated');
    } catch (err) {
      message.error('Failed to update mastery level');
      console.error(err);
    }
  };

  // ==================== Export Functions ====================
  const exportWords = async (format) => {
    try {
      const res = await wordBankAPI.export(format, masteryFilter);
      
      if (format === 'csv') {
        // 下载 CSV 文件
        const blob = new Blob([res.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `wordbank_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
      } else {
        // 复制到剪贴板
        await navigator.clipboard.writeText(JSON.stringify(res.data, null, 2));
        message.success('Copied to clipboard');
      }
      
      setExportModalVisible(false);
    } catch (err) {
      message.error('Export failed');
    }
  };

  // ==================== Speech ====================
  const speakWord = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      utterance.onerror = () => message.warning('Speech synthesis failed');
      window.speechSynthesis.speak(utterance);
    } else {
      message.warning('Your browser does not support speech synthesis');
    }
  };

  // ==================== Statistics ====================
  const stats = {
    total: words.length,
    new: words.filter(w => w.mastery_level === 0).length,
    learning: words.filter(w => w.mastery_level === 1).length,
    familiar: words.filter(w => w.mastery_level === 2).length,
    mastered: words.filter(w => w.mastery_level === 3).length,
    
    // 学习进度百分比
    progress: Math.round((words.filter(w => w.mastery_level >= 2).length / words.length) * 100) || 0,
    
    // 今日目标进度
    dailyProgress: Math.min(Math.round((todayReviewed / dailyGoal) * 100), 100),
    
    // 平均掌握程度
    avgMastery: words.length ? 
      Math.round((words.reduce((sum, w) => sum + w.mastery_level, 0) / words.length) * 100) / 100 : 0,
  };

  // ==================== UI Components ====================
  const ReviewModal = () => (
    <Modal
      title="📖 Word Review"
      open={reviewModalVisible}
      onCancel={() => setReviewModalVisible(false)}
      footer={null}
      width={600}
      centered
    >
      {reviewWords.length > 0 ? (
        <div>
          {/* 进度条 */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text type="secondary">
                {currentReviewIndex + 1} / {reviewWords.length}
              </Text>
              <Text type="success">
                {Math.round(((currentReviewIndex + 1) / reviewWords.length) * 100)}%
              </Text>
            </div>
            <Progress 
              percent={Math.round(((currentReviewIndex + 1) / reviewWords.length) * 100)} 
              showInfo={false}
              strokeColor="#2563eb"
            />
          </div>

          {/* 当前单词 */}
          <div style={{ textAlign: 'center', minHeight: 200, padding: '20px 0' }}>
            <Title level={2} style={{ marginBottom: 16, color: '#1a1a2e' }}>
              {reviewWords[currentReviewIndex].text}
            </Title>
            
            {reviewWords[currentReviewIndex].part_of_speech && (
              <Tag style={{ marginBottom: 16 }}>
                {reviewWords[currentReviewIndex].part_of_speech}
              </Tag>
            )}
            
            {showDefinition ? (
              <div style={{ textAlign: 'left', background: '#f9fafb', padding: 20, borderRadius: 12 }}>
                <Text strong>Definition: </Text>
                <Paragraph>{reviewWords[currentReviewIndex].definition}</Paragraph>
                
                {reviewWords[currentReviewIndex].example_sentence && (
                  <>
                    <Divider style={{ margin: '12px 0' }} />
                    <Text strong>Example: </Text>
                    <Text italic>"{reviewWords[currentReviewIndex].example_sentence}"</Text>
                  </>
                )}
              </div>
            ) : (
              <Button 
                type="link" 
                onClick={() => setShowDefinition(true)}
                size="large"
              >
                Show Definition
              </Button>
            )}
          </div>

          {/* 按钮组 */}
          {showDefinition ? (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 24 }}>
              <Button 
                size="large"
                onClick={() => {
                  markReviewed(reviewWords[currentReviewIndex].id, false);
                  if (currentReviewIndex < reviewWords.length - 1) {
                    setCurrentReviewIndex(prev => prev + 1);
                    setShowDefinition(false);
                  } else {
                    setReviewModalVisible(false);
                    loadWordBank(); // 刷新数据
                  }
                }}
              >
                Need Review Again
              </Button>
              <Button 
                type="primary"
                size="large"
                onClick={() => {
                  markReviewed(reviewWords[currentReviewIndex].id, true);
                  if (currentReviewIndex < reviewWords.length - 1) {
                    setCurrentReviewIndex(prev => prev + 1);
                    setShowDefinition(false);
                  } else {
                    setReviewModalVisible(false);
                    loadWordBank(); // 刷新数据
                  }
                }}
              >
                I Know It
              </Button>
            </div>
          ) : (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <Button 
                onClick={() => {
                  if (currentReviewIndex > 0) {
                    setCurrentReviewIndex(prev => prev - 1);
                    setShowDefinition(false);
                  }
                }}
                disabled={currentReviewIndex === 0}
              >
                Previous
              </Button>
              <Button type="primary" onClick={() => setShowDefinition(true)}>
                Check Definition
              </Button>
            </div>
          )}
        </div>
      ) : (
        <Empty description="No words to review today">
          <Button onClick={() => setReviewModalVisible(false)}>
            Close
          </Button>
        </Empty>
      )}
    </Modal>
  );

  const StatsModal = () => (
    <Modal
      title="📊 Learning Statistics"
      open={statsModalVisible}
      onCancel={() => setStatsModalVisible(false)}
      footer={null}
      width={500}
    >
      <div style={{ padding: '10px 0' }}>
        {/* 总体进度 */}
        <div style={{ marginBottom: 24 }}>
          <Text strong>Overall Progress</Text>
          <Progress percent={stats.progress} status="active" strokeColor="#2563eb" />
        </div>

        {/* 掌握程度分布 */}
        <Card size="small" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text>🆕 New</Text>
            <Text strong>{stats.new}</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text>📚 Learning</Text>
            <Text strong>{stats.learning}</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <Text>✨ Familiar</Text>
            <Text strong>{stats.familiar}</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <Text>🌟 Mastered</Text>
            <Text strong>{stats.mastered}</Text>
          </div>
        </Card>

        {/* 统计数据 */}
        <Row gutter={16}>
          <Col span={12}>
            <Card size="small">
              <Statistic 
                title="Total Words" 
                value={stats.total} 
                suffix="words"
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small">
              <Statistic 
                title="Avg Mastery" 
                value={stats.avgMastery} 
                precision={2}
                suffix="/3"
              />
            </Card>
          </Col>
        </Row>

        {/* 复习历史（简化版） */}
        {reviewHistory.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Text strong>Recent Activity</Text>
            <div style={{ maxHeight: 150, overflowY: 'auto', marginTop: 8 }}>
              {reviewHistory.slice(0, 5).map((item, index) => (
                <div key={index} style={{ 
                  padding: '8px 0', 
                  borderBottom: index < 4 ? '1px solid #f0f0f0' : 'none'
                }}>
                  <Text>{item.date}: </Text>
                  <Text strong>{item.count} words</Text>
                  <Text type="secondary"> reviewed</Text>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );

  const ExportModal = () => (
    <Modal
      title="📤 Export Word Bank"
      open={exportModalVisible}
      onCancel={() => setExportModalVisible(false)}
      footer={null}
    >
      <div style={{ padding: '10px 0' }}>
        <Alert
          message={`Exporting ${masteryFilter !== null ? 
            masteryConfig.find(m => m.value === masteryFilter)?.label : 'all'} words`}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button 
            block 
            icon={<ExportOutlined />}
            onClick={() => exportWords('csv')}
          >
            Export as CSV (for Excel)
          </Button>
          <Button 
            block 
            icon={<ExportOutlined />}
            onClick={() => exportWords('json')}
          >
            Export as JSON
          </Button>
          <Button 
            block 
            icon={<ExportOutlined />}
            onClick={() => exportWords('text')}
          >
            Copy as Text List
          </Button>
        </Space>
      </div>
    </Modal>
  );

  // ==================== Main Render ====================
  return (
    <div className="page-container" style={{ padding: '24px' }}>
      {/* Modals */}
      <Modal
        title="Remove Word"
        open={deleteModalVisible}
        onOk={removeWord}
        onCancel={() => setDeleteModalVisible(false)}
        okText="Remove"
        cancelText="Cancel"
        okButtonProps={{ danger: true }}
      >
        <p>Are you sure you want to remove this word from your bank?</p>
      </Modal>

      <ReviewModal />
      <StatsModal />
      <ExportModal />

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 16
        }}>
          <div>
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
              <BookOutlined style={{ marginRight: 10, color: '#059669' }} />
              My Word Bank
            </Title>
            <Text type="secondary">{words.length} words saved</Text>
          </div>
          
          <Space wrap>
            {/* Daily Goal Progress */}
            <Card size="small" style={{ borderRadius: 20, background: '#f0f9ff' }}>
              <Space>
                <StarOutlined style={{ color: '#f59e0b' }} />
                <Text strong>{todayReviewed}/{dailyGoal}</Text>
                <Text type="secondary">today</Text>
              </Space>
            </Card>

            <Button 
              type="primary"
              icon={<ReloadOutlined />}
              onClick={startReview}
              disabled={words.length === 0}
            >
              Review Words
            </Button>

            <Button 
              icon={<BarChartOutlined />}
              onClick={() => setStatsModalVisible(true)}
            >
              Stats
            </Button>

            <Button 
              icon={<ExportOutlined />}
              onClick={() => setExportModalVisible(true)}
            >
              Export
            </Button>

            {batchDeleteMode ? (
              <Button 
                danger
                onClick={batchDelete}
              >
                Delete ({selectedWords.size})
              </Button>
            ) : (
              <Button 
                onClick={() => setBatchDeleteMode(true)}
              >
                Batch Select
              </Button>
            )}

            {batchDeleteMode && (
              <Button 
                size="small"
                onClick={() => {
                  setBatchDeleteMode(false);
                  setSelectedWords(new Set());
                }}
              >
                Cancel
              </Button>
            )}
          </Space>
        </div>

        {/* Search and Filter Bar */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Input
            placeholder="Search words or definitions..."
            prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 300, borderRadius: 8 }}
            allowClear
          />

          <Select
            value={sortBy}
            onChange={setSortBy}
            style={{ width: 200 }}
            placeholder="Sort by"
          >
            {sortOptions.map(opt => (
              <Option key={opt.value} value={opt.value}>
                <SortAscendingOutlined /> {opt.label}
              </Option>
            ))}
          </Select>

          <Button 
            icon={<ReloadOutlined />} 
            onClick={loadWordBank}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Mastery Filter Tabs */}
      <div style={{ marginBottom: 24 }}>
        <Space wrap>
          <Button 
            size="large"
            type={masteryFilter === null ? 'primary' : 'default'}
            onClick={() => setMasteryFilter(null)}
            style={{ borderRadius: 30, minWidth: 80 }}
          >
            All <Tag style={{ marginLeft: 4 }}>{stats.total}</Tag>
          </Button>
          {masteryConfig.map(level => (
            <Button
              key={level.value}
              size="large"
              type={masteryFilter === level.value ? 'primary' : 'default'}
              onClick={() => setMasteryFilter(level.value)}
              style={{ 
                borderRadius: 30,
                minWidth: 100,
                background: masteryFilter === level.value ? level.color : level.bg,
                borderColor: level.color,
                color: masteryFilter === level.value ? '#fff' : level.color,
              }}
            >
              {level.emoji} {level.label} 
              <Tag style={{ 
                marginLeft: 4,
                background: masteryFilter === level.value ? 'rgba(255,255,255,0.2)' : '#fff',
                border: 'none'
              }}>
                {stats[level.label.toLowerCase()] || 0}
              </Tag>
            </Button>
          ))}
        </Space>
      </div>

      {/* Statistics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable style={{ borderRadius: 16, textAlign: 'center' }} size="small">
            <Statistic 
              title="Total Vocabulary" 
              value={stats.total} 
              prefix={<BookOutlined style={{ color: '#2563eb' }} />}
              valueStyle={{ color: '#2563eb', fontWeight: 600, fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable style={{ borderRadius: 16, textAlign: 'center' }} size="small">
            <Statistic 
              title="Mastery Progress" 
              value={stats.progress} 
              suffix="%"
              prefix={<CheckCircleOutlined style={{ color: '#059669' }} />}
              valueStyle={{ color: '#059669', fontWeight: 600, fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable style={{ borderRadius: 16, textAlign: 'center' }} size="small">
            <Statistic 
              title="Today's Goal" 
              value={stats.dailyProgress} 
              suffix="%"
              prefix={<StarOutlined style={{ color: '#d97706' }} />}
              valueStyle={{ color: '#d97706', fontWeight: 600, fontSize: 28 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card hoverable style={{ borderRadius: 16, textAlign: 'center' }} size="small">
            <Statistic 
              title="Avg Mastery" 
              value={stats.avgMastery} 
              precision={1}
              suffix="/3"
              prefix={<BarChartOutlined style={{ color: '#7c3aed' }} />}
              valueStyle={{ color: '#7c3aed', fontWeight: 600, fontSize: 28 }}
            />
          </Card>
        </Col>
      </Row>

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
                ? 'No words saved yet. Start building your vocabulary!'
                : 'No words match your filters'
            }
          >
            {words.length === 0 ? (
              <Button 
                type="primary" 
                href="/daily-words"
                size="large"
              >
                Go to Daily Words
              </Button>
            ) : (
              <Button onClick={() => {
                setSearch('');
                setMasteryFilter(null);
              }}>
                Clear Filters
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredWords.map((entry) => {
            const mastery = masteryConfig[entry.mastery_level] || masteryConfig[0];
            return (
              <Card
                key={entry.id}
                style={{ 
                  borderRadius: 16, 
                  border: selectedWords.has(entry.id) ? '2px solid #2563eb' : '1px solid #e5e7eb',
                  transition: 'all 0.2s',
                  background: selectedWords.has(entry.id) ? '#eff6ff' : '#fff',
                }}
                bodyStyle={{ padding: '16px 24px' }}
                hoverable
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  gap: 16,
                  flexWrap: 'wrap',
                }}>
                  {/* Left: Word Info */}
                  <div style={{ flex: 1, minWidth: 250 }}>
                    {batchDeleteMode && (
                      <input
                        type="checkbox"
                        checked={selectedWords.has(entry.id)}
                        onChange={(e) => {
                          const newSelected = new Set(selectedWords);
                          if (e.target.checked) {
                            newSelected.add(entry.id);
                          } else {
                            newSelected.delete(entry.id);
                          }
                          setSelectedWords(newSelected);
                        }}
                        style={{ marginRight: 12 }}
                      />
                    )}
                    
                    <Space size={12} align="center" wrap>
                      <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
                        {entry.text}
                      </Title>
                      <Tag style={{
                        borderRadius: 16,
                        color: mastery.color,
                        background: mastery.bg,
                        border: 'none',
                        fontWeight: 500,
                        padding: '4px 12px',
                      }}>
                        {mastery.emoji} {mastery.label}
                      </Tag>
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
                    
                    <Paragraph style={{ 
                      margin: '8px 0 4px', 
                      color: '#374151', 
                      fontSize: 15,
                      paddingLeft: batchDeleteMode ? 28 : 0,
                    }}>
                      {entry.definition}
                    </Paragraph>
                    
                    {entry.example_sentence && (
                      <Text italic style={{ 
                        color: '#6b7280', 
                        fontSize: 14,
                        display: 'block',
                        marginBottom: 4,
                        paddingLeft: batchDeleteMode ? 28 : 0,
                      }}>
                        "{entry.example_sentence}"
                      </Text>
                    )}
                    
                    <div style={{ paddingLeft: batchDeleteMode ? 28 : 0 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        Added: {new Date(entry.added_at).toLocaleDateString()}
                      </Text>
                      {entry.last_reviewed && (
                        <Text type="secondary" style={{ fontSize: 12, marginLeft: 16 }}>
                          Last review: {new Date(entry.last_reviewed).toLocaleDateString()}
                        </Text>
                      )}
                    </div>
                  </div>
                  
                  {/* Right: Actions */}
                  {!batchDeleteMode && (
                    <Space size={8}>
                      <Tooltip title="Listen">
                        <Button 
                          shape="circle" 
                          icon={<SoundOutlined />} 
                          onClick={() => speakWord(entry.text)}
                          style={{ color: '#2563eb', borderColor: '#93c5fd' }}
                        />
                      </Tooltip>
                      
                      <Tooltip title="Update mastery level">
                        <Select
                          value={entry.mastery_level}
                          onChange={(value) => updateMastery(entry.id, value)}
                          style={{ width: 100 }}
                          size="small"
                          dropdownMatchSelectWidth={false}
                        >
                          {masteryConfig.map(level => (
                            <Option key={level.value} value={level.value}>
                              <Tag style={{ 
                                color: level.color, 
                                background: level.bg,
                                border: 'none',
                                marginRight: 0
                              }}>
                                {level.emoji} {level.label}
                              </Tag>
                            </Option>
                          ))}
                        </Select>
                      </Tooltip>
                      
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
            );
          })}
        </div>
      )}
    </div>
  );
}