import { useState, useEffect } from 'react';
import { Typography, Card, Row, Col, Progress } from 'antd';
import {
  ReadOutlined,
  SoundOutlined,
  AudioOutlined,
  TeamOutlined,
  MessageOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { dailyLearningAPI, progressAPI } from '../api';
import HelpButton from '../components/HelpButton';

const { Title, Text } = Typography;

const modules = [
  {
    title: 'Listening Lab',
    icon: <SoundOutlined />,
    path: '/listening',
    desc: 'Practice with lectures, discussions, and Q&A clips',
    color: '#d97706',
    bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
  },
  {
    title: 'Speaking Studio',
    icon: <AudioOutlined />,
    path: '/speaking',
    desc: 'Improve pronunciation and expression',
    color: '#dc2626',
    bg: 'linear-gradient(135deg, #fef2f2, #fecaca)',
  },
  {
    title: 'Vocabulary',
    icon: <ReadOutlined />,
    path: '/daily-words',
    desc: 'Daily words, word bank & review all in one place',
    color: '#2563eb',
    bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
  },
  {
    title: 'Forum',
    icon: <MessageOutlined />,
    path: '/forum',
    desc: 'Share skills, experiences, and discuss academic culture',
    color: '#0891b2',
    bg: 'linear-gradient(135deg, #ecfeff, #cffafe)',
  },
  {
    title: 'Room',
    icon: <TeamOutlined />,
    path: '/room',
    desc: 'Join speaking rooms, watch together, or play vocabulary games',
    color: '#7c3aed',
    bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
  },
];

export default function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    wordsLearned: 0,
    totalWords: 0,
    listeningDone: 0,
    speakingSessions: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [wordRes, progressRes] = await Promise.all([
          dailyLearningAPI.getStats(),
          progressAPI.getDashboard(),
        ]);
        setStats({
          wordsLearned: wordRes.data.total_learned || 0,
          totalWords: wordRes.data.total_words || 0,
          listeningDone: progressRes.data.listening_done || 0,
          speakingSessions: progressRes.data.speaking_sessions || 0,
        });
      } catch (error) {
        console.error('Failed to load stats:', error);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="page-container">
      {/* Welcome banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
        borderRadius: 16,
        padding: '40px 48px',
        marginBottom: 32,
        color: '#fff',
      }}>
        <Title level={2} style={{ color: '#fff', margin: 0, fontWeight: 700, fontSize: 26 }}>
          Welcome back! Ready to practice?
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, display: 'block', marginTop: 8 }}>
          Build confidence for university lectures, seminars, and academic discussions.
        </Text>
        <Row gutter={32} style={{ marginTop: 28 }}>
          {[
            { label: 'Words Learned', value: stats.wordsLearned, total: Math.max(stats.totalWords, 50) },
            { label: 'Listening Done', value: stats.listeningDone, total: Math.max(stats.listeningDone, 10) },
            { label: 'Speaking Sessions', value: stats.speakingSessions, total: Math.max(stats.speakingSessions, 20) },
          ].map((s) => (
            <Col span={8} key={s.label}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{s.label}</Text>
              <div style={{ color: '#fff', fontSize: 16, fontWeight: 600, margin: '4px 0 2px' }}>
                {s.value} / {s.total}
              </div>
              <Progress
                percent={s.total > 0 ? Math.round((s.value / s.total) * 100) : 0}
                strokeColor={{ from: '#60a5fa', to: '#a78bfa' }}
                trailColor="rgba(255,255,255,0.15)"
                size="small"
                style={{ marginTop: 4 }}
              />
            </Col>
          ))}
        </Row>
      </div>

      {/* Module cards */}
      <Title level={4} style={{ marginBottom: 16, fontWeight: 600, color: '#374151' }}>
        Learning Modules
      </Title>
      <Row gutter={[16, 16]}>
        {modules.map((m) => (
          <Col xs={24} sm={12} lg={8} key={m.path}>
            <Card
              hoverable
              onClick={() => navigate(m.path)}
              style={{
                height: '100%',
                borderRadius: 12,
                border: 'none',
                overflow: 'hidden',
              }}
              styles={{ body: { padding: 24 } }}
            >
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: m.bg,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 22,
                color: m.color,
                marginBottom: 16,
              }}>
                {m.icon}
              </div>
              <Title level={5} style={{ margin: '0 0 8px', fontWeight: 600 }}>{m.title}</Title>
              <Text type="secondary" style={{ fontSize: 13, lineHeight: 1.5 }}>{m.desc}</Text>
              <div style={{ marginTop: 16 }}>
                <Text style={{ color: m.color, fontSize: 13, fontWeight: 600 }}>
                  Start learning <ArrowRightOutlined style={{ fontSize: 11 }} />
                </Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
      <HelpButton guideKey="home" />
    </div>
  );
}
