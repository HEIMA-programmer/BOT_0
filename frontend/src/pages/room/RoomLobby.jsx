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
import { io } from 'socket.io-client';
import { roomAPI } from '../../api/index';
import { TYPE_CONFIG } from '../../utils/roomUtils';
import HelpButton from '../../components/HelpButton';

const { Title, Text } = Typography;

const TYPE_CARDS = [
  { key: 'watch', label: 'Watch Together', Icon: PlayCircleOutlined, color: '#2563eb', desc: 'Watch content in sync' },
  { key: 'speaking', label: 'Speaking Room', Icon: VideoCameraOutlined, color: '#16a34a', desc: 'Video call practice' },
  { key: 'game', label: 'Game Room', Icon: TrophyOutlined, color: '#ea580c', desc: 'Vocabulary games' },
];

export default function RoomLobby({ user }) {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [selectedType, setSelectedType] = useState('speaking');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [isPublic, setIsPublic] = useState(true);
  const [roomName, setRoomName] = useState('');
  const [rooms, setRooms] = useState([]);
  const [recentRecords, setRecentRecords] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const [creating, setCreating] = useState(false);

  const roomPath = (room) => {
    if (room.room_type === 'speaking') return `/room/${room.id}/speaking`;
    if (room.room_type === 'watch')    return `/room/${room.id}/watch`;
    return `/room/${room.id}/waiting`;
  };

  const fetchRooms = useCallback(async () => {
    try {
      const res = await roomAPI.list();
      setRooms(res.data.rooms || []);
    } catch {
      // Silently fail on background refresh; errors on user-triggered refresh are shown below
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchRooms();
    roomAPI.getRecords()
      .then(res => setRecentRecords((res.data.records || []).slice(0, 3)))
      .catch(() => {});
  }, [fetchRooms]);

  // Real-time lobby updates via WebSocket
  useEffect(() => {
    const socket = io('/room', { withCredentials: true });

    socket.on('connect', () => {
      socket.emit('join_lobby');
    });

    socket.on('rooms_updated', () => {
      fetchRooms();
    });

    socket.on('room_invitation', (data) => {
      Modal.confirm({
        title: 'Room Invitation',
        content: `${data.invited_by} invited you to join "${data.room_name}" (${data.room_type}). Join now?`,
        okText: 'Join',
        cancelText: 'Decline',
        onOk: async () => {
          try {
            const res = await roomAPI.join(data.invite_code);
            const joinedRoom = res.data.room;
            const dest = joinedRoom.room_type === 'watch' ? 'watch'
              : joinedRoom.room_type === 'speaking' ? 'speaking'
              : 'waiting';
            navigate(`/room/${joinedRoom.id}/${dest}`);
          } catch (err) {
            message.error(err.response?.data?.error || 'Failed to join room');
          }
        },
      });
    });

    return () => {
      socket.emit('leave_lobby');
      socket.disconnect();
    };
  }, [fetchRooms, navigate, message]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchRooms();
    } catch {
      message.error('Failed to refresh rooms');
    } finally {
      setRefreshing(false);
    }
  }, [fetchRooms, message]);

  const handleCreate = useCallback(async () => {
    if (!roomName.trim()) {
      message.warning('Please enter a room name');
      return;
    }
    setCreating(true);
    try {
      const res = await roomAPI.create({
        name: roomName.trim(),
        room_type: selectedType,
        max_players: maxPlayers,
        visibility: isPublic ? 'public' : 'private',
      });
      const { room } = res.data;
      setShowCreate(false);
      setRoomName('');
      navigate(roomPath(room), { state: { room } });
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to create room';
      message.error(msg);
    } finally {
      setCreating(false);
    }
  }, [roomName, selectedType, maxPlayers, isPublic, navigate, message]);

  const handleJoin = useCallback(async () => {
    if (joinCode.length < 6) return;
    setJoining(true);
    setJoinError('');
    try {
      const res = await roomAPI.join(joinCode);
      const { room } = res.data;
      setShowJoin(false);
      setJoinCode('');
      navigate(roomPath(room), { state: { room } });
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid code or room not found';
      setJoinError(msg);
    } finally {
      setJoining(false);
    }
  }, [joinCode, navigate]);

  const handleJoinOpen = useCallback(async (room) => {
    // Join via invite code (using the room's invite_code from the list)
    setJoining(true);
    try {
      const res = await roomAPI.join(room.invite_code);
      const { room: joinedRoom } = res.data;
      navigate(roomPath(joinedRoom), { state: { room: joinedRoom } });
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to join room';
      message.error(msg);
    } finally {
      setJoining(false);
    }
  }, [navigate, message]);

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
            <Text type="secondary" style={{ fontSize: 12 }}>Updates in real time</Text>
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
              const tc = TYPE_CONFIG[room.room_type];
              if (!tc) return null;
              const isFull = room.player_count >= room.max_players;
              const inProgress = room.status === 'active';
              // Game rooms lock out mid-session; speaking/watch allow joining anytime
              const canJoin = !isFull && (!inProgress || room.room_type !== 'game');
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
                        status={inProgress ? (room.room_type === 'game' ? 'warning' : 'processing') : 'success'}
                        text={
                          <Text style={{ fontSize: 12, color: inProgress ? (room.room_type === 'game' ? '#d97706' : '#2563eb') : '#16a34a' }}>
                            {inProgress
                              ? (room.room_type === 'game' ? 'In Game' : 'Active')
                              : 'Waiting'}
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
                        <Text style={{ fontSize: 13 }}>{room.player_count}/{room.max_players} players</Text>
                      </Space>
                    </Space>

                    <Button
                      type="primary"
                      block
                      loading={joining}
                      disabled={!canJoin}
                      onClick={() => handleJoinOpen(room)}
                      style={{ borderRadius: 8 }}
                    >
                      {isFull ? 'Full' : (inProgress && room.room_type === 'game') ? 'In Progress' : 'Join'}
                    </Button>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </div>

      {/* Recent */}
      {recentRecords.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <Title level={4} style={{ margin: 0 }}>Recent</Title>
            <Button type="link" icon={<HistoryOutlined />} onClick={() => navigate('/room/records')}>
              View All
            </Button>
          </div>
          <Row gutter={[12, 12]}>
            {recentRecords.map(rec => {
              const tc = TYPE_CONFIG[rec.room_type];
              if (!tc) return null;
              const mins = rec.duration_secs ? Math.round(rec.duration_secs / 60) : 0;
              const dateStr = rec.created_at ? new Date(rec.created_at).toLocaleDateString() : '';
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
                        <Text strong style={{ fontSize: 13, display: 'block' }}>{rec.room_name}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>{rec.summary || `${mins} min`}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 11 }}>{dateStr}</Text>
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
              <InputNumber min={1} max={8} value={maxPlayers} onChange={v => setMaxPlayers(v)} size="large" style={{ width: 100 }} />
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
      <HelpButton guideKey="room" />
    </div>
  );
}
