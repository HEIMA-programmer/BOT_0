import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Tabs, List, Tag, Space, Empty, Button, Modal, Avatar } from 'antd';
import {
  ClockCircleOutlined, ArrowLeftOutlined, EyeOutlined, TrophyOutlined,
} from '@ant-design/icons';
import { roomAPI } from '../../api/index';
import { TYPE_CONFIG } from '../../utils/roomUtils';

const { Title, Text } = Typography;

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'watch', label: 'Watch Together' },
  { key: 'speaking', label: 'Speaking' },
  { key: 'game', label: 'Game' },
];

function getMySubmission(round, userId) {
  if (!round.answers || !userId) return null;
  // Word Duel uses int keys, Context Guesser uses string keys — try both
  return round.answers[userId] || round.answers[String(userId)] || null;
}

function getRoundPoints(round, userId, gameType) {
  if (gameType === 'word_duel') {
    return round.winner_user_id === userId ? 1 : 0;
  }
  // Context Guesser: use points dict or submission's correct_count
  if (round.points && round.points[userId] != null) {
    return round.points[userId];
  }
  const sub = getMySubmission(round, userId);
  return sub?.correct_count ?? 0;
}

export default function MyRecords({ user }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gameDetailOpen, setGameDetailOpen] = useState(false);
  const [gameDetailData, setGameDetailData] = useState(null);

  useEffect(() => {
    roomAPI.getRecords()
      .then(res => setRecords(res.data.records || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = activeTab === 'all'
    ? records
    : records.filter(r => r.room_type === activeTab);

  const formatDuration = (secs) => {
    if (!secs) return '0 min';
    const m = Math.round(secs / 60);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}min`;
  };

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          type="text"
          onClick={() => navigate('/room')}
          style={{ color: '#6b7280' }}
        />
        <div>
          <Title level={2} style={{ margin: 0 }}>My Records</Title>
          <Text type="secondary">Your room activity history</Text>
        </div>
      </div>

      {/* Filter Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={TABS.map(t => ({ key: t.key, label: t.label }))}
        style={{ marginBottom: 4 }}
      />

      {/* Record List */}
      {filtered.length === 0 ? (
        <Empty
          description={loading ? 'Loading...' : 'No records found'}
          style={{ marginTop: 60 }}
        />
      ) : (
        <List
          dataSource={filtered}
          renderItem={record => {
            const tc = TYPE_CONFIG[record.room_type];
            if (!tc) return null;
            const dateStr = record.created_at
              ? new Date(record.created_at).toLocaleString()
              : '';
            return (
              <List.Item
                style={{
                  background: '#fff', borderRadius: 12, marginBottom: 12,
                  padding: '16px 20px', border: '1px solid #e5e7eb',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
                  {/* Type Icon */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 10, background: tc.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <tc.Icon style={{ fontSize: 20, color: tc.color }} />
                  </div>

                  {/* Main Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                      <Text strong style={{ fontSize: 15 }}>{record.room_name}</Text>
                      <Tag
                        color={tc.color}
                        style={{ borderRadius: 4, fontSize: 11, lineHeight: '18px' }}
                      >
                        {tc.label}
                      </Tag>
                    </div>
                    <Space size={12} wrap>
                      <Text type="secondary" style={{ fontSize: 12 }}>{dateStr}</Text>
                      <Space size={4}>
                        <ClockCircleOutlined style={{ fontSize: 11, color: '#9ca3af' }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {formatDuration(record.duration_secs)}
                        </Text>
                      </Space>
                    </Space>
                  </div>

                  {/* Summary */}
                  <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {record.summary && (
                      <Text style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                        {record.summary}
                      </Text>
                    )}
                    {record.room_type === 'game' && (
                      <Button
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          // Find the matching game_record by room_id, user_id, and approximate time
                          roomAPI.getGameRecord(record.id).then(res => {
                            setGameDetailData(res.data);
                            setGameDetailOpen(true);
                          }).catch(() => {
                            // Fallback: just show summary
                            setGameDetailData({ summary: record.summary, room_name: record.room_name });
                            setGameDetailOpen(true);
                          });
                        }}
                      >
                        Details
                      </Button>
                    )}
                  </div>
                </div>
              </List.Item>
            );
          }}
        />
      )}

      {/* Game Detail Modal */}
      <Modal
        title={<><TrophyOutlined style={{ color: '#d97706' }} /> Game Details</>}
        open={gameDetailOpen}
        onCancel={() => { setGameDetailOpen(false); setGameDetailData(null); }}
        footer={null}
        width={600}
      >
        {gameDetailData && (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Tag color="blue">{gameDetailData.game_type?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Game'}</Tag>
              <Text>Score: <Text strong>{gameDetailData.score}</Text> pts</Text>
              <Text>Rounds: <Text strong>{gameDetailData.total_rounds}</Text></Text>
              <Text>Placement: <Text strong>#{gameDetailData.placement}</Text></Text>
              {gameDetailData.duration_secs ? (
                <Text>Time: <Text strong>{Math.max(gameDetailData.duration_secs, 0)}s</Text></Text>
              ) : null}
            </Space>
            {gameDetailData.rounds_data && (() => {
              try {
                const rounds = JSON.parse(gameDetailData.rounds_data);
                const uid = gameDetailData.user_id || user?.id;
                const isContextGuesser = gameDetailData.game_type === 'context_guesser';

                return (
                  <List
                    dataSource={rounds}
                    renderItem={(round, idx) => {
                      const pts = getRoundPoints(round, uid, gameDetailData.game_type);
                      const mySub = getMySubmission(round, uid);

                      return (
                        <List.Item>
                          <div style={{ width: '100%' }}>
                            {/* Round header with points */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <Text strong>Round {idx + 1}</Text>
                              <Tag color={pts > 0 ? 'green' : 'default'} style={{ fontSize: 11 }}>
                                +{pts} pt{pts !== 1 ? 's' : ''}
                              </Tag>
                            </div>

                            {/* Question */}
                            <div style={{ marginTop: 4 }}>
                              <Text type="secondary">Q: {round.question || round.sentence}</Text>
                            </div>
                            {round.revealed_sentence ? (
                              <div style={{ marginTop: 4 }}>
                                <Text type="secondary">Sentence: {round.revealed_sentence}</Text>
                              </div>
                            ) : null}

                            {/* Correct answer */}
                            <div style={{ marginTop: 4 }}>
                              <Text>
                                Correct answer:{' '}
                                <Text code>
                                  {Array.isArray(round.correct_answers)
                                    ? round.correct_answers.join(', ')
                                    : round.correct_answer}
                                </Text>
                              </Text>
                            </div>

                            {/* My answer */}
                            <div style={{ marginTop: 6 }}>
                              {!isContextGuesser ? (
                                // Word Duel: single answer
                                mySub ? (
                                  <Text>
                                    My answer:{' '}
                                    <Tag color={mySub.correct ? 'success' : 'error'} style={{ fontSize: 12 }}>
                                      {mySub.answer || '(no answer)'}
                                    </Tag>
                                  </Text>
                                ) : (
                                  <Text type="secondary" style={{ fontSize: 12 }}>No answer submitted</Text>
                                )
                              ) : (
                                // Context Guesser: multiple blanks
                                mySub && Array.isArray(mySub.answers) ? (
                                  <div>
                                    <Text>My answers:{' '}</Text>
                                    {mySub.answers.map((ans, i) => {
                                      const isCorrect = mySub.correct_mask?.[i];
                                      return (
                                        <Tag
                                          key={i}
                                          color={isCorrect ? 'success' : 'error'}
                                          style={{ fontSize: 12, marginBottom: 4 }}
                                        >
                                          {ans || '(blank)'}
                                        </Tag>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <Text type="secondary" style={{ fontSize: 12 }}>No answer submitted</Text>
                                )
                              )}
                            </div>
                          </div>
                        </List.Item>
                      );
                    }}
                  />
                );
              } catch {
                return <Text type="secondary">Round data unavailable</Text>;
              }
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
}
