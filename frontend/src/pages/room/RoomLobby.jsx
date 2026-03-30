import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Button, Card, Tag, Modal, Input, InputNumber,
  Switch, Row, Col, Space, Empty, App as AntdApp,
  Divider, Badge,
} from 'antd';
import {
  PlayCircleOutlined, VideoCameraOutlined, TrophyOutlined,
  PlusOutlined, LoginOutlined, TeamOutlined,
  ReloadOutlined, HistoryOutlined,
  CrownOutlined, GlobalOutlined, LockOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

const TYPE_CONFIG = {
  watch: { label: 'Watch Together', color: '#2563eb', bg: '#dbeafe', Icon: PlayCircleOutlined },
  speaking: { label: 'Speaking Room', color: '#16a34a', bg: '#dcfce7', Icon: VideoCameraOutlined },
  game: { label: 'Game Room', color: '#ea580c', bg: '#ffedd5', Icon: TrophyOutlined },
};

const TYPE_CARDS = [
  { key: 'watch', label: 'Watch Together', Icon: PlayCircleOutlined, color: '#2563eb', desc: 'Watch content in sync' },
  { key: 'speaking', label: 'Speaking Room', Icon: VideoCameraOutlined, color: '#16a34a', desc: 'Video call practice' },
  { key: 'game', label: 'Game Room', Icon: TrophyOutlined, color: '#ea580c', desc: 'Vocabulary games' },
];

const MOCK_ROOMS = [
  { id: 'r001', name: "Alice's Speaking Room", type: 'speaking', host: 'Alice', hostId: 101, players: 2, maxPlayers: 4, status: 'waiting', detail: 'Topic: Daily Campus Life' },
  { id: 'r002', name: 'Word Duel Battle', type: 'game', host: 'Bob', hostId: 102, players: 3, maxPlayers: 4, status: 'waiting', detail: 'Game: Word Duel' },
  { id: 'r003', name: 'Study Together', type: 'watch', host: 'Carol', hostId: 103, players: 4, maxPlayers: 4, status: 'active', detail: 'Academic Vocabulary Basics' },
  { id: 'r004', name: 'English Corner', type: 'speaking', host: 'David', hostId: 104, players: 1, maxPlayers: 4, status: 'waiting', detail: 'Topic: Free Talk' },
  { id: 'r005', name: 'Vocab Challenge', type: 'game', host: 'Eve', hostId: 105, players: 2, maxPlayers: 4, status: 'waiting', detail: 'Game: Context Guesser' },
];

const MOCK_RECENT = [
  { id: 'rec1', type: 'game', name: 'Word Battle', date: '2026-03-29', summary: 'Won · 5 rounds' },
  { id: 'rec2', type: 'speaking', name: 'English Practice', date: '2026-03-28', summary: 'Talked 23 min' },
  { id: 'rec3', type: 'watch', name: 'Study Session', date: '2026-03-27', summary: 'Watched 20 min' },
];

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function genId() {
  return 'room_' + Date.now();
}

export default function RoomLobby({ user }) {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [selectedType, setSelectedType] = useState('speaking');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPublic, setIsPublic] = useState(true);
  const [roomName, setRoomName] = useState('');
  const [rooms, setRooms] = useState(MOCK_ROOMS);
  const [refreshing, setRefreshing] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);

  // TODO: replace with real API polling when backend is ready
  // useEffect(() => {
  //   const timer = setInterval(() => fetchRooms(), 10000);
  //   return () => clearInterval(timer);
  // }, []);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRooms([...MOCK_ROOMS]);
      setRefreshing(false);
    }, 600);
  }, []);

  const handleCreate = useCallback(() => {
    if (!roomName.trim()) {
      message.warning('Please enter a room name');
      return;
    }
    setCreating(true);
    setTimeout(() => {
      const roomId = genId();
      const room = {
        id: roomId,
        name: roomName.trim(),
        type: selectedType,
        maxPlayers,
        visibility: isPublic ? 'public' : 'private',
        inviteCode: genCode(),
        hostId: user?.id,
        hostName: user?.username,
      };
      setCreating(false);
      setShowCreate(false);
      setRoomName('');
      navigate(`/room/${roomId}/waiting`, { state: { room } });
    }, 400);
  }, [roomName, selectedType, maxPlayers, isPublic, user, navigate, message]);

  const handleJoin = useCallback(() => {
    if (joinCode.length < 6) return;
    setJoining(true);
    setJoinError('');
    setTimeout(() => {
      if (joinCode === 'AAAAAA') {
        setJoinError('Invalid code or room not found');
        setJoining(false);
        return;
      }
      const roomId = 'r_' + joinCode;
      const room = {
        id: roomId,
        name: 'Room ' + joinCode,
        type: 'speaking',
        maxPlayers: 4,
        visibility: 'private',
        inviteCode: joinCode,
        hostId: 999,
        hostName: 'Host',
      };
      setJoining(false);
      setShowJoin(false);
      setJoinCode('');
      navigate(`/room/${roomId}/waiting`, { state: { room } });
    }, 600);
  }, [joinCode, navigate]);

  const handleJoinOpen = useCallback((room) => {
    navigate(`/room/${room.id}/waiting`, { state: { room } });
  }, [navigate]);

  const openCreate = () => {
    setRoomName('');
    setSelectedType('speaking');
    setMaxPlayers(4);
    setIsPublic(true);
    setShowCreate(true);
  };

  const openJoin = () => {
    setJoinCode('');
    setJoinError('');
    setShowJoin(true);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <Title level={2} style={{ margin: 0 }}>Rooms</Title>
          <Text type="secondary">Practice English with others in real time</Text>
        </div>
        <Space size={12}>
          <Button size="large" icon={<LoginOutlined />} onClick={openJoin}>
            Join Room
          </Button>
          <Button type="primary" size="large" icon={<PlusOutlined />} onClick={openCreate}>
            Create Room
          </Button>
        </Space>
      </div>

      {/* Open Rooms */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>Open Rooms</Title>
          <Space>
            <Text type="secondary" style={{ fontSize: 12 }}>Auto-refreshes every 10s</Text>
            <Button size="small" icon={<ReloadOutlined spin={refreshing} />} onClick={handleRefresh}>
              Refresh
            </Button>
          </Space>
        </div>

        {rooms.length === 0 ? (
          <Empty description="No open rooms right now. Be the first to create one!" />
        ) : (
          <Row gutter={[16, 16]}>
            {rooms.map(room => {
              const tc = TYPE_CONFIG[room.type];
              const isFull = room.players >= room.maxPlayers;
              const inProgress = room.status === 'active';
              const canJoin = !isFull && !inProgress;
              return (
                <Col xs={24} sm={12} lg={8} key={room.id}>
                  <Card
                    hoverable={canJoin}
                    style={{ borderRadius: 12, opacity: (isFull || inProgress) ? 0.72 : 1 }}
                    styles={{ body: { padding: '16px 20px' } }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <Space size={10}>
                        <div style={{
                          width: 40, height: 40, borderRadius: 10,
                          background: tc.bg,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <tc.Icon style={{ fontSize: 20, color: tc.color }} />
                        </div>
                        <div>
                          <Text strong style={{ fontSize: 14, display: 'block' }}>{room.name}</Text>
                          <Tag color={tc.color} style={{ marginTop: 2, borderRadius: 4, fontSize: 11, lineHeight: '18px' }}>
                            {tc.label}
                          </Tag>
                        </div>
                      </Space>
                      <Badge
                        status={inProgress ? 'warning' : 'success'}
                        text={
                          <Text style={{ fontSize: 12, color: inProgress ? '#d97706' : '#16a34a' }}>
                            {inProgress ? 'In Game' : 'Waiting'}
                          </Text>
                        }
                      />
                    </div>

                    <Divider style={{ margin: '0 0 12px 0' }} />

                    <Space direction="vertical" size={4} style={{ width: '100%', marginBottom: 12 }}>
                      <Space size={6}>
                        <CrownOutlined style={{ fontSize: 12, color: '#d97706' }} />
                        <Text type="secondary" style={{ fontSize: 13 }}>{room.host}</Text>
                      </Space>
                      <Space size={6}>
                        <TeamOutlined style={{ fontSize: 12, color: '#6b7280' }} />
                        <Text style={{ fontSize: 13 }}>{room.players}/{room.maxPlayers} players</Text>
                      </Space>
                      <Text type="secondary" style={{ fontSize: 12 }}>{room.detail}</Text>
                    </Space>

                    <Button
                      type="primary"
                      block
                      disabled={!canJoin}
                      onClick={() => handleJoinOpen(room)}
                      style={{ borderRadius: 8 }}
                    >
                      {isFull ? 'Full' : inProgress ? 'In Progress' : 'Join'}
                    </Button>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </div>

      {/* Recent */}
      {MOCK_RECENT.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>Recent</Title>
            <Button type="link" icon={<HistoryOutlined />} onClick={() => navigate('/room/records')}>
              View All
            </Button>
          </div>
          <Row gutter={[12, 12]}>
            {MOCK_RECENT.map(rec => {
              const tc = TYPE_CONFIG[rec.type];
              return (
                <Col xs={24} sm={8} key={rec.id}>
                  <Card
                    hoverable
                    style={{ borderRadius: 10, cursor: 'pointer' }}
                    styles={{ body: { padding: '14px 16px' } }}
                    onClick={() => navigate('/room/records')}
                  >
                    <Space size={12} align="start">
                      <div style={{
                        width: 36, height: 36, borderRadius: 8,
                        background: tc.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                      }}>
                        <tc.Icon style={{ fontSize: 16, color: tc.color }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <Text strong style={{ fontSize: 13, display: 'block' }}>{rec.name}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{rec.summary}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>{rec.date}</Text>
                      </div>
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </div>
      )}

      {/* Create Room Modal */}
      <Modal
        title="Create Room"
        open={showCreate}
        onCancel={() => setShowCreate(false)}
        footer={null}
        width={520}
        destroyOnClose
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Room Name</Text>
            <Input
              placeholder="Enter room name..."
              maxLength={20}
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              onPressEnter={handleCreate}
              showCount
              size="large"
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Room Type</Text>
            <Row gutter={10}>
              {TYPE_CARDS.map(tc => (
                <Col span={8} key={tc.key}>
                  <div
                    onClick={() => setSelectedType(tc.key)}
                    style={{
                      border: `2px solid ${selectedType === tc.key ? tc.color : '#e5e7eb'}`,
                      borderRadius: 10,
                      padding: '14px 12px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: selectedType === tc.key ? `${tc.color}12` : '#fafafa',
                      transition: 'all 0.18s',
                      userSelect: 'none',
                    }}
                  >
                    <tc.Icon style={{ fontSize: 26, color: tc.color, marginBottom: 6 }} />
                    <div style={{ fontSize: 12, fontWeight: 600, color: selectedType === tc.key ? tc.color : '#374151' }}>
                      {tc.label}
                    </div>
                    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, lineHeight: '16px' }}>{tc.desc}</div>
                  </div>
                </Col>
              ))}
            </Row>
          </div>

          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Max Players</Text>
            <Space>
              <InputNumber min={2} max={8} value={maxPlayers} onChange={v => setMaxPlayers(v)} size="large" style={{ width: 100 }} />
              <Text type="secondary" style={{ fontSize: 13 }}>{maxPlayers} players max</Text>
            </Space>
          </div>

          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text strong>Public Room</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {isPublic ? 'Visible in the Rooms lobby' : 'Invite code only'}
                </Text>
              </div>
              <Switch
                checked={isPublic}
                onChange={setIsPublic}
                checkedChildren={<GlobalOutlined />}
                unCheckedChildren={<LockOutlined />}
              />
            </div>
          </div>

          <Button
            type="primary"
            size="large"
            block
            loading={creating}
            onClick={handleCreate}
            disabled={!roomName.trim()}
            style={{ borderRadius: 8 }}
          >
            Create
          </Button>
        </div>
      </Modal>

      {/* Join Room Modal */}
      <Modal
        title="Join Room"
        open={showJoin}
        onCancel={() => setShowJoin(false)}
        footer={null}
        width={380}
        destroyOnClose
      >
        <div style={{ padding: '16px 0', textAlign: 'center' }}>
          <Text type="secondary" style={{ display: 'block', marginBottom: 20, fontSize: 14 }}>
            Enter the 6-character invite code
          </Text>
          <Input.OTP
            length={6}
            value={joinCode}
            onChange={val => {
              setJoinCode(val.toUpperCase());
              setJoinError('');
            }}
            size="large"
          />
          {joinError && (
            <Text type="danger" style={{ display: 'block', marginTop: 10, fontSize: 13 }}>
              {joinError}
            </Text>
          )}
          <Button
            type="primary"
            size="large"
            block
            loading={joining}
            disabled={joinCode.length < 6}
            onClick={handleJoin}
            style={{ marginTop: 24, borderRadius: 8 }}
          >
            Join
          </Button>
        </div>
      </Modal>
    </div>
  );
}
