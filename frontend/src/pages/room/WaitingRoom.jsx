import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Typography, Button, Tag, Modal, Space, Avatar, App as AntdApp,
  Popover, Select, Row, Col, Tooltip,
} from 'antd';
import {
  PlayCircleOutlined, VideoCameraOutlined, TrophyOutlined,
  CrownOutlined, TeamOutlined, LinkOutlined, CheckOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

const TYPE_CONFIG = {
  watch: { label: 'Watch Together', color: '#2563eb', bg: '#dbeafe', Icon: PlayCircleOutlined },
  speaking: { label: 'Speaking Room', color: '#16a34a', bg: '#dcfce7', Icon: VideoCameraOutlined },
  game: { label: 'Game Room', color: '#ea580c', bg: '#ffedd5', Icon: TrophyOutlined },
};

const AVATAR_COLORS = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#db2777', '#0891b2', '#d97706'];

function getAvatarColor(username = '') {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash += username.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const MOCK_TOPICS = [
  'Free Talk', 'Daily Campus Life', 'Academic Writing',
  'Job Interviews', 'Current Events', 'Technology & AI',
  'Study Abroad', 'Climate Change',
];

const GAMES = [
  {
    key: 'word_duel',
    label: 'Word Duel',
    desc: 'Race to guess the word from its definition. First correct answer wins the round.',
    players: '2–8',
    icon: '⚡',
  },
  {
    key: 'context_guesser',
    label: 'Context Guesser',
    desc: 'Fill in the blank word from context. Semantic matches earn partial points.',
    players: '2–8',
    icon: '🔍',
  },
];

const MOCK_ROOM = {
  id: 'demo_room',
  name: 'Demo Room',
  type: 'speaking',
  maxPlayers: 4,
  visibility: 'public',
  inviteCode: 'DEMO01',
  hostId: 1,
  hostName: 'You',
};

export default function WaitingRoom({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { message } = AntdApp.useApp();

  const { room: initialRoom } = location.state || {};
  const [room] = useState(initialRoom || MOCK_ROOM);

  const userId = user?.id || 0;
  const isHost = room.hostId === userId;

  const buildInitialMembers = () => {
    if (isHost) {
      return [
        { id: userId, username: user?.username || 'You', role: 'host', isReady: false },
        { id: 2001, username: 'Alice', role: 'member', isReady: false },
      ];
    }
    return [
      { id: room.hostId || 999, username: room.hostName || 'Host', role: 'host', isReady: true },
      { id: userId, username: user?.username || 'You', role: 'member', isReady: false },
      { id: 2001, username: 'Alice', role: 'member', isReady: true },
    ];
  };

  const [members, setMembers] = useState(buildInitialMembers);
  const [showInvite, setShowInvite] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [topic, setTopic] = useState(room.topic || 'Free Talk');
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameStep, setGameStep] = useState(1);

  const tc = TYPE_CONFIG[room.type] || TYPE_CONFIG.speaking;
  const myMember = members.find(m => m.id === userId);
  const canStart = true; // TODO: restore check: members.every(m => m.isReady) && members.length >= 2

  const handleToggleReady = useCallback(() => {
    setMembers(prev => prev.map(m =>
      m.id === userId ? { ...m, isReady: !m.isReady } : m
    ));
  }, [userId]);

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(room.inviteCode || '').then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }, [room.inviteCode]);

  const handleTransferHost = useCallback((memberId) => {
    setMembers(prev => prev.map(m => ({
      ...m,
      role: m.id === memberId ? 'host' : m.id === userId ? 'member' : m.role,
    })));
    message.success('Host transferred');
  }, [userId, message]);

  const handleLeave = useCallback(() => {
    if (isHost && members.length > 1) {
      setShowLeaveModal(true);
    } else {
      navigate('/room');
    }
  }, [isHost, members.length, navigate]);

  const confirmLeave = useCallback(() => {
    if (transferTarget) handleTransferHost(transferTarget);
    setShowLeaveModal(false);
    navigate('/room');
  }, [transferTarget, handleTransferHost, navigate]);

  const handleStart = useCallback(() => {
    if (!canStart) return;
    const path = room.type === 'watch' ? 'watch'
      : room.type === 'speaking' ? 'speaking'
      : 'game';
    navigate(`/room/${room.id}/${path}`, {
      state: { room: { ...room, topic, gameType: selectedGame }, members },
    });
  }, [canStart, room, topic, selectedGame, members, navigate]);

  const ActivityIcon = tc.Icon;

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      {/* Top Bar */}
      <div style={{
        background: '#1a1a2e',
        padding: '0 24px',
        height: 56,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <Space size={12}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: tc.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ActivityIcon style={{ fontSize: 16, color: tc.color }} />
          </div>
          <Text strong style={{ color: '#f1f5f9', fontSize: 16 }}>{room.name}</Text>
          <Tag color={tc.color} style={{ borderRadius: 6 }}>{tc.label}</Tag>
        </Space>
        <Popover
          open={showInvite}
          onOpenChange={setShowInvite}
          trigger="click"
          placement="bottomRight"
          content={
            <div style={{ width: 220 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                Invite Code
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  flex: 1, fontFamily: 'monospace', fontSize: 22, fontWeight: 700,
                  letterSpacing: 4, color: '#1a1a2e', textAlign: 'center',
                  background: '#f0f2f5', borderRadius: 8, padding: '8px 0',
                }}>
                  {room.inviteCode || '------'}
                </div>
                <Button
                  icon={codeCopied ? <CheckOutlined /> : <LinkOutlined />}
                  onClick={handleCopyCode}
                  type={codeCopied ? 'primary' : 'default'}
                  style={{ flexShrink: 0 }}
                >
                  {codeCopied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            </div>
          }
        >
          <Button icon={<TeamOutlined />} style={{ background: 'transparent', borderColor: '#334155', color: '#94a3b8' }}>
            Invite Friends
          </Button>
        </Popover>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, maxWidth: 760, margin: '0 auto', width: '100%', padding: '32px 24px 100px' }}>
        {/* Member Grid */}
        <div style={{ marginBottom: 28 }}>
          <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 16 }}>
            Members — {members.length}/{room.maxPlayers}
          </Text>
          <Row gutter={[16, 16]}>
            {members.map(member => {
              const isMe = member.id === userId;
              const memberMenu = isHost && !isMe ? (
                <div>
                  <Button
                    type="text"
                    size="small"
                    icon={<CrownOutlined style={{ color: '#d97706' }} />}
                    onClick={() => handleTransferHost(member.id)}
                    style={{ width: '100%', textAlign: 'left' }}
                  >
                    Transfer Host
                  </Button>
                </div>
              ) : null;

              return (
                <Col xs={12} sm={8} md={6} key={member.id}>
                  <Popover content={memberMenu} trigger={memberMenu ? 'click' : ''} placement="top">
                    <div style={{
                      textAlign: 'center',
                      padding: '16px 8px',
                      borderRadius: 12,
                      background: '#fff',
                      border: `2px solid ${isMe ? tc.color + '40' : '#f0f2f5'}`,
                      cursor: memberMenu ? 'pointer' : 'default',
                      transition: 'border-color 0.2s',
                    }}>
                      <div style={{ position: 'relative', display: 'inline-block', marginBottom: 8 }}>
                        <Avatar
                          size={56}
                          style={{ background: getAvatarColor(member.username), fontSize: 22, fontWeight: 700 }}
                        >
                          {member.username.charAt(0).toUpperCase()}
                        </Avatar>
                        {member.role === 'host' && (
                          <CrownOutlined style={{
                            position: 'absolute', top: -6, right: -6,
                            color: '#d97706', fontSize: 14,
                            background: '#fff', borderRadius: '50%', padding: 2,
                          }} />
                        )}
                      </div>
                      <Text strong style={{ display: 'block', fontSize: 13 }}>
                        {member.username}{isMe ? ' (You)' : ''}
                      </Text>
                      <Tag
                        color={member.isReady ? 'success' : 'default'}
                        style={{ marginTop: 4, borderRadius: 6, fontSize: 11 }}
                      >
                        {member.isReady ? 'Ready' : 'Waiting'}
                      </Tag>
                    </div>
                  </Popover>
                </Col>
              );
            })}
          </Row>
        </div>

        {/* Type-specific Config */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
          {room.type === 'watch' && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>Content</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 80, height: 56, background: '#f0f2f5', borderRadius: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <PlayCircleOutlined style={{ fontSize: 24, color: '#9ca3af' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <Text strong>{room.contentTitle || 'No content selected'}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {room.contentTitle ? 'Listening Clip' : 'Select content to watch together'}
                  </Text>
                </div>
                {isHost && (
                  <Button size="small">
                    {room.contentTitle ? 'Change' : 'Select'}
                  </Button>
                )}
              </div>
            </div>
          )}

          {room.type === 'speaking' && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>Conversation Topic</Text>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: '#f0f9ff', borderRadius: 8, padding: '10px 14px',
              }}>
                <Tag color="blue" style={{ flexShrink: 0 }}>Topic</Tag>
                <Text style={{ flex: 1, fontSize: 15, fontWeight: 500, marginLeft: 4 }}>{topic}</Text>
                {isHost && (
                  <Button size="small" onClick={() => setShowTopicModal(true)}>Change</Button>
                )}
              </div>
            </div>
          )}

          {room.type === 'game' && (
            <div>
              <Text strong style={{ display: 'block', marginBottom: 12 }}>
                {gameStep === 1 ? 'Select a Game' : `Game Config — ${GAMES.find(g => g.key === selectedGame)?.label}`}
              </Text>

              {gameStep === 1 && (
                <Row gutter={12}>
                  {GAMES.map(game => (
                    <Col span={12} key={game.key}>
                      <div
                        onClick={() => isHost && setSelectedGame(game.key)}
                        style={{
                          border: `2px solid ${selectedGame === game.key ? '#ea580c' : '#e5e7eb'}`,
                          borderRadius: 10, padding: '14px',
                          cursor: isHost ? 'pointer' : 'default',
                          background: selectedGame === game.key ? '#fff7ed' : '#fafafa',
                          transition: 'all 0.18s',
                        }}
                      >
                        <div style={{ fontSize: 20, marginBottom: 4 }}>{game.icon}</div>
                        <Text strong style={{ fontSize: 13, color: selectedGame === game.key ? '#ea580c' : '#374151' }}>
                          {game.label}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 12 }}>{game.desc}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11, marginTop: 4, display: 'block' }}>
                          {game.players} players
                        </Text>
                      </div>
                    </Col>
                  ))}
                </Row>
              )}

              {gameStep === 2 && selectedGame === 'word_duel' && (
                <div>
                  <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>Difficulty</Text>
                  <Select
                    defaultValue="medium"
                    style={{ width: 200 }}
                    disabled={!isHost}
                    options={[
                      { value: 'easy', label: 'Easy — Common Words' },
                      { value: 'medium', label: 'Medium — AWL Level 1-4' },
                      { value: 'hard', label: 'Hard — AWL Level 5-10' },
                    ]}
                  />
                </div>
              )}

              {gameStep === 2 && selectedGame === 'context_guesser' && (
                <div>
                  <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 10 }}>Question Category</Text>
                  <Select
                    defaultValue="academic"
                    style={{ width: 200 }}
                    disabled={!isHost}
                    options={[
                      { value: 'academic', label: 'Academic English' },
                      { value: 'general', label: 'General Vocabulary' },
                      { value: 'science', label: 'Science & Tech' },
                    ]}
                  />
                </div>
              )}

              {isHost && (
                <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                  {gameStep === 2 && (
                    <Button size="small" onClick={() => setGameStep(1)}>← Back</Button>
                  )}
                  {gameStep === 1 && selectedGame && (
                    <Button size="small" type="primary" onClick={() => setGameStep(2)}>
                      Configure →
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: '#fff', borderTop: '1px solid #e5e7eb',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        zIndex: 50,
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleLeave}
        >
          Leave
        </Button>

        <Space size={10}>
          <Button
            size="large"
            type={myMember?.isReady ? 'default' : 'primary'}
            onClick={handleToggleReady}
            style={myMember?.isReady ? { borderColor: '#16a34a', color: '#16a34a' } : {}}
          >
            {myMember?.isReady ? '✓ Ready' : 'Ready'}
          </Button>
          {isHost && (
            <Tooltip title={!canStart ? 'All members must be ready (min 2 players)' : ''}>
              <Button
                size="large"
                type="primary"
                disabled={!canStart}
                onClick={handleStart}
                style={{ minWidth: 100 }}
              >
                Start
              </Button>
            </Tooltip>
          )}
        </Space>
      </div>

      {/* Topic Selection Modal */}
      <Modal
        title="Select Topic"
        open={showTopicModal}
        onCancel={() => setShowTopicModal(false)}
        onOk={() => setShowTopicModal(false)}
        width={400}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 0' }}>
          {MOCK_TOPICS.map(t => (
            <Tag
              key={t}
              color={topic === t ? 'blue' : 'default'}
              style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 13, borderRadius: 6 }}
              onClick={() => { setTopic(t); setShowTopicModal(false); }}
            >
              {t}
            </Tag>
          ))}
        </div>
      </Modal>

      {/* Leave Confirmation Modal (host with other members) */}
      <Modal
        title="Leave Room"
        open={showLeaveModal}
        onCancel={() => setShowLeaveModal(false)}
        onOk={confirmLeave}
        okText="Leave"
        okButtonProps={{ danger: true }}
        width={380}
      >
        <Text style={{ display: 'block', marginBottom: 16 }}>
          You're the host. Please select a new host before leaving.
        </Text>
        <Select
          placeholder="Select new host"
          style={{ width: '100%' }}
          value={transferTarget}
          onChange={setTransferTarget}
          options={members
            .filter(m => m.id !== userId)
            .map(m => ({ value: m.id, label: m.username }))
          }
        />
      </Modal>
    </div>
  );
}
