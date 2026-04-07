import { Typography, Button, Card, List, Tag, Spin, Empty, Progress, Divider } from 'antd';
import { ArrowLeftOutlined, HistoryOutlined, MessageOutlined, TrophyOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { chatHistoryAPI } from '../api';
import ConversationView from '../components/ConversationView';

const { Title, Text } = Typography;

const SCENARIO_LABELS = {
  free_conversation: { label: 'Free Conversation', color: 'green' },
  office_hours: { label: 'Office Hours', color: 'blue' },
  seminar_discussion: { label: 'Seminar Discussion', color: 'purple' },
};

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatDuration(startStr, endStr) {
  if (!startStr || !endStr) return '';
  const ms = new Date(endStr) - new Date(startStr);
  const mins = Math.round(ms / 60000);
  if (mins < 1) return '< 1 min';
  return `${mins} min`;
}

function getScoreColor(score) {
  if (score >= 8) return '#10b981';
  if (score >= 6) return '#3b82f6';
  if (score >= 4) return '#f59e0b';
  return '#ef4444';
}

export default function ConversationHistory() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadSessions = async () => {
    setLoading(true);
    try {
      const res = await chatHistoryAPI.getSessions({ page, per_page: 10 });
      setSessions(res.data.sessions || []);
      setTotal(res.data.total || 0);
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
    setLoading(false);
  };

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps -- load data on page change */
  useEffect(() => {
    loadSessions();
  }, [page]);
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const loadSessionDetail = async (sessionId) => {
    setDetailLoading(true);
    try {
      const res = await chatHistoryAPI.getSession(sessionId);
      setSelectedSession(res.data);
    } catch (err) {
      console.error('Failed to load session detail:', err);
    }
    setDetailLoading(false);
  };

  // Detail view
  if (selectedSession) {
    const report = selectedSession.report;
    const messages = (selectedSession.messages || []).map((m, i) => ({
      id: `hist-${m.id || i}`,
      role: m.role === 'assistant' ? 'ai' : 'user',
      text: m.content,
      timestamp: m.created_at,
    }));

    return (
      <div className="page-container">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedSession(null)} />
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
              <MessageOutlined style={{ marginRight: 10, color: '#3b82f6' }} />
              Conversation Detail
            </Title>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Tag color={SCENARIO_LABELS[selectedSession.scenario_type]?.color || 'default'}>
              {SCENARIO_LABELS[selectedSession.scenario_type]?.label || selectedSession.scenario_type}
            </Tag>
            <Text type="secondary">{formatDate(selectedSession.started_at)}</Text>
            {selectedSession.ended_at && (
              <Text type="secondary">
                ({formatDuration(selectedSession.started_at, selectedSession.ended_at)})
              </Text>
            )}
          </div>
        </div>

        {/* Conversation transcript */}
        <div style={{ marginTop: 24 }}>
          <ConversationView
            status="ended"
            aiSpeaking={false}
            messages={messages}
            readOnly
          />
        </div>

        {/* Scoring report */}
        {report && (
          <Card style={{ marginTop: 24, borderRadius: 16, border: '1px solid #e5e7eb' }}>
            <Title level={4} style={{ marginBottom: 20 }}>
              <TrophyOutlined style={{ marginRight: 8, color: '#f59e0b' }} />
              Conversation Report
            </Title>

            {/* Overall score */}
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Progress
                type="circle"
                percent={(report.overall_score || 0) * 10}
                format={() => (
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 700, color: getScoreColor(report.overall_score) }}>
                      {report.overall_score}
                    </div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>out of 10</div>
                  </div>
                )}
                strokeColor={getScoreColor(report.overall_score)}
                size={100}
              />
            </div>

            {/* Dimension scores */}
            {report.dimensions && Object.entries(report.dimensions).map(([key, dim]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text strong style={{ fontSize: 13, textTransform: 'capitalize' }}>
                    {key.replace('_', ' ')}
                  </Text>
                  <Text style={{ color: getScoreColor(dim.score), fontWeight: 600 }}>
                    {dim.score}/10
                  </Text>
                </div>
                <Progress percent={dim.score * 10} showInfo={false} size="small" />
                {dim.feedback && (
                  <Text type="secondary" style={{ fontSize: 12 }}>{dim.feedback}</Text>
                )}
              </div>
            ))}

            <Divider />

            {/* Strengths & Improvements */}
            {report.strengths?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ color: '#10b981' }}>Strengths:</Text>
                <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                  {report.strengths.map((s, i) => <li key={i} style={{ fontSize: 13 }}>{s}</li>)}
                </ul>
              </div>
            )}
            {report.improvements?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <Text strong style={{ color: '#f59e0b' }}>Areas for Improvement:</Text>
                <ul style={{ margin: '8px 0', paddingLeft: 20 }}>
                  {report.improvements.map((s, i) => <li key={i} style={{ fontSize: 13 }}>{s}</li>)}
                </ul>
              </div>
            )}
            {report.suggested_phrases?.length > 0 && (
              <div>
                <Text strong style={{ color: '#3b82f6' }}>Suggested Phrases:</Text>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {report.suggested_phrases.map((p, i) => (
                    <Tag key={i} color="blue" style={{ borderRadius: 8, padding: '4px 12px' }}>{p}</Tag>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}
      </div>
    );
  }

  // List view
  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/speaking', { state: { tab: 'ai-chat' } })} />
          <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
            <HistoryOutlined style={{ marginRight: 10, color: '#3b82f6' }} />
            Conversation History
          </Title>
        </div>
        <Text type="secondary">Review your past conversations and scores</Text>
      </div>

      <div style={{ marginTop: 24 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        ) : sessions.length === 0 ? (
          <Empty description="No conversations yet. Start practicing!" />
        ) : (
          <List
            dataSource={sessions}
            pagination={{
              current: page,
              total,
              pageSize: 10,
              onChange: setPage,
            }}
            renderItem={session => {
              const scenarioInfo = SCENARIO_LABELS[session.scenario_type] || { label: session.scenario_type, color: 'default' };
              return (
                <Card
                  style={{
                    marginBottom: 12,
                    borderRadius: 12,
                    cursor: 'pointer',
                    border: '1px solid #e5e7eb',
                    transition: 'box-shadow 0.2s',
                  }}
                  bodyStyle={{ padding: 16 }}
                  hoverable
                  onClick={() => loadSessionDetail(session.id)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                        <Tag color={scenarioInfo.color}>{scenarioInfo.label}</Tag>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          {formatDate(session.started_at)}
                        </Text>
                        {session.ended_at && (
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            ({formatDuration(session.started_at, session.ended_at)})
                          </Text>
                        )}
                      </div>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {session.message_count || 0} messages
                      </Text>
                    </div>
                    {session.overall_score && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{
                          fontSize: 20,
                          fontWeight: 700,
                          color: getScoreColor(session.overall_score),
                        }}>
                          {session.overall_score}
                        </div>
                        <div style={{ fontSize: 10, color: '#9ca3af' }}>/ 10</div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            }}
          />
        )}
      </div>

      {detailLoading && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(255,255,255,0.7)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <Spin size="large" />
        </div>
      )}
    </div>
  );
}
