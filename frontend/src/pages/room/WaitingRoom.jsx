import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Typography, Button, Tag, Modal, Space, Avatar, App as AntdApp,
  Popover, Select, Row, Col, Tooltip,
} from 'antd';
import {
  CrownOutlined, TeamOutlined, LinkOutlined, CheckOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { io } from 'socket.io-client';
import { roomAPI } from '../../api/index';
import { TYPE_CONFIG, getAvatarColor, copyInviteCode } from '../../utils/roomUtils';

const { Text } = Typography;

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

export default function WaitingRoom({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: roomIdParam } = useParams();
  const { message } = AntdApp.useApp();

  const [room, setRoom] = useState(location.state?.room || null);
  const [members, setMembers] = useState([]);
  const [showInvite, setShowInvite] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [transferTarget, setTransferTarget] = useState(null);
  const [selectedGame, setSelectedGame] = useState(null);
  const [gameStep, setGameStep] = useState(1);

  const socketRef = useRef(null);
  const isLeavingRef = useRef(false);   // true when navigating to game or clicking Leave
  const leaveTimerRef = useRef(null);    // delayed leave — cancelled on StrictMode remount
  const userId = user?.id || 0;

  // Derive host status from live members array so it stays in sync
  const myMember = members.find(m => m.user_id === userId);
  const isHost = myMember?.role === 'host';
  const canStart = members.length >= 2 && members.every(m => m.is_ready);

  const roomId = room?.id ? Number(room.id) : Number(roomIdParam);
  const tc = TYPE_CONFIG[room?.room_type] || TYPE_CONFIG.speaking;

  // Used by game_started to navigate with latest state (avoids stale socket closure)
  const [gameLaunching, setGameLaunching] = useState(false);

  // ── Load room data ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;

    const load = async () => {
      try {
        const res = await roomAPI.getRoom(roomId);
        const loadedRoom = res.data.room;
        // Type guard from API data (e.g. direct URL access)
        if (loadedRoom.room_type === 'speaking') {
          navigate(`/room/${roomId}/speaking`, { state: { room: loadedRoom }, replace: true });
          return;
        }
        if (loadedRoom.room_type === 'watch') {
          navigate(`/room/${roomId}/watch`, { state: { room: loadedRoom }, replace: true });
          return;
        }
        setRoom(loadedRoom);
        setMembers(res.data.members || []);
      } catch {
        message.error('Failed to load room');
        navigate('/room');
      }
    };

    // Use location.state for the fast path (member list still needs a fetch)
    if (location.state?.room) {
      setRoom(location.state.room);
    }
    load();

    // Type guard: speaking/watch rooms skip WaitingRoom entirely
    const stateRoom = location.state?.room;
    if (stateRoom?.room_type === 'speaking') {
      navigate(`/room/${roomId}/speaking`, { state: { room: stateRoom }, replace: true });
      return;
    }
    if (stateRoom?.room_type === 'watch') {
      navigate(`/room/${roomId}/watch`, { state: { room: stateRoom }, replace: true });
      return;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ── Navigate when game starts (uses latest state, avoids stale socket closure) ──
  useEffect(() => {
    if (!gameLaunching || !room) return;
    // replace: WaitingRoom is no longer meaningful once the game starts,
    // so back-button should go to Lobby, not back here.
    navigate(`/room/${roomId}/game`, {
      state: { room: { ...room, gameType: selectedGame }, members },
      replace: true,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameLaunching]);

  // ── WebSocket connection ──────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !userId) return;

    // Cancel any leave timer from the previous mount (React StrictMode double-invoke)
    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }

    const socket = io('/room', { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_waiting_room', { room_id: roomId });
    });

    socket.on('member_joined', ({ member }) => {
      setMembers(prev => {
        if (prev.find(m => m.user_id === member.user_id)) return prev;
        return [...prev, member];
      });
    });

    socket.on('member_left', ({ user_id }) => {
      setMembers(prev => prev.filter(m => m.user_id !== user_id));
    });

    socket.on('ready_changed', ({ user_id, is_ready }) => {
      setMembers(prev =>
        prev.map(m => m.user_id === user_id ? { ...m, is_ready } : m)
      );
    });

    socket.on('host_changed', ({ new_host_user_id }) => {
      setMembers(prev =>
        prev.map(m => ({
          ...m,
          // Set new host; demote anyone who was previously host (works on all clients)
          role: m.user_id === new_host_user_id ? 'host' : m.role === 'host' ? 'member' : m.role,
        }))
      );
    });

    socket.on('game_started', () => {
      isLeavingRef.current = true;
      setGameLaunching(true);  // triggers the navigation useEffect above with fresh state
    });

    socket.on('room_error', ({ message: errMsg }) => {
      message.error(errMsg);
    });

    return () => {
      socket.disconnect();
      // Delay the REST leave so React StrictMode's intentional unmount→remount cycle
      // can cancel it (remount clears leaveTimerRef above). Real navigation will not
      // remount, so the timer fires and cleans up the DB record.
      if (!isLeavingRef.current) {
        leaveTimerRef.current = setTimeout(() => {
          roomAPI.leave(roomId).catch(() => {});
        }, 300);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  // ── Browser back-button: call REST leave so DB is cleaned up immediately ──
  useEffect(() => {
    if (!roomId) return;
    const onPop = () => {
      if (!isLeavingRef.current) {
        roomAPI.leave(roomId).catch(() => {});
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [roomId]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleToggleReady = useCallback(() => {
    const newReady = !myMember?.is_ready;
    socketRef.current?.emit('set_ready', { room_id: roomId, is_ready: newReady });
  }, [myMember, roomId]);

  const handleCopyCode = useCallback(() => {
    copyInviteCode(room?.invite_code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }, [room?.invite_code]);

  const handleTransferHost = useCallback((targetUserId) => {
    socketRef.current?.emit('transfer_host', { room_id: roomId, new_host_user_id: targetUserId });
    message.success('Host transfer requested');
  }, [roomId, message]);

  const handleLeave = useCallback(async () => {
    if (isHost && members.length > 1) {
      setShowLeaveModal(true);
    } else {
      isLeavingRef.current = true;  // prevent double-leave in cleanup
      try {
        await roomAPI.leave(roomId);
      } finally {
        navigate('/room');
      }
    }
  }, [isHost, members.length, roomId, navigate]);

  const confirmLeave = useCallback(async () => {
    if (transferTarget) handleTransferHost(transferTarget);
    setShowLeaveModal(false);
    isLeavingRef.current = true;  // prevent double-leave in cleanup
    try {
      await roomAPI.leave(roomId);
    } finally {
      navigate('/room');
    }
  }, [transferTarget, handleTransferHost, roomId, navigate]);

  const handleStart = useCallback(() => {
    if (!canStart) return;
    socketRef.current?.emit('start_game', { room_id: roomId });
  }, [canStart, roomId]);

  if (!room) return null;

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
                  {room.invite_code || '------'}
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
            Members — {members.length}/{room.max_players}
          </Text>
          <Row gutter={[16, 16]}>
            {members.map(member => {
              const isMe = member.user_id === userId;
              const memberMenu = isHost && !isMe ? (
                <div>
                  <Button
                    type="text"
                    size="small"
                    icon={<CrownOutlined style={{ color: '#d97706' }} />}
                    onClick={() => handleTransferHost(member.user_id)}
                    style={{ width: '100%', textAlign: 'left' }}
                  >
                    Transfer Host
                  </Button>
                </div>
              ) : null;

              return (
                <Col xs={12} sm={8} md={6} key={member.user_id}>
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
                          {(member.username || '?').charAt(0).toUpperCase()}
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
                        color={member.is_ready ? 'success' : 'default'}
                        style={{ marginTop: 4, borderRadius: 6, fontSize: 11 }}
                      >
                        {member.is_ready ? 'Ready' : 'Waiting'}
                      </Tag>
                    </div>
                  </Popover>
                </Col>
              );
            })}
          </Row>
        </div>

        {/* Type-specific Config — only game rooms use WaitingRoom */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '20px 24px', border: '1px solid #e5e7eb' }}>
          {room.room_type === 'game' && (
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
            type={myMember?.is_ready ? 'default' : 'primary'}
            onClick={handleToggleReady}
            style={myMember?.is_ready ? { borderColor: '#16a34a', color: '#16a34a' } : {}}
          >
            {myMember?.is_ready ? '✓ Ready' : 'Ready'}
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
            .filter(m => m.user_id !== userId)
            .map(m => ({ value: m.user_id, label: m.username }))
          }
        />
      </Modal>
    </div>
  );
}
