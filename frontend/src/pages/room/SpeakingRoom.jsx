import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Typography, Button, Tag, Modal, Space, Avatar, Tooltip, Popover, Spin } from 'antd';
import {
  AudioOutlined, AudioMutedOutlined, VideoCameraOutlined,
  VideoCameraAddOutlined, ArrowLeftOutlined,
  CrownOutlined, LinkOutlined, CheckOutlined, TeamOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { io } from 'socket.io-client';
import AgoraRTC, {
  AgoraRTCProvider,
  useRTCClient,
  useLocalMicrophoneTrack,
  useLocalCameraTrack,
  usePublish,
  useJoin,
  useRemoteUsers,
  RemoteUser,
  LocalUser,
} from 'agora-rtc-react';

import { roomAPI } from '../../api/index';
import { getAvatarColor, TOPICS, copyInviteCode } from '../../utils/roomUtils';

const { Text } = Typography;

export default function SpeakingRoomWrapper({ user }) {
  // Create a fresh client per mount so StrictMode's unmount→remount gets a clean state.
  // A module-level client would still be in the "leaving" state when useJoin
  // tries to rejoin after StrictMode's cleanup, causing both sides to appear offline.
  const [client] = useState(() => AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' }));
  const location = useLocation();
  const { id: roomIdParam } = useParams();
  const roomId = location.state?.room?.id ? Number(location.state.room.id) : Number(roomIdParam);

  const [agoraToken, setAgoraToken] = useState(null);
  const [agoraAppId, setAgoraAppId] = useState(null);
  const [channel, setChannel] = useState(null);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (!roomId) return;
    roomAPI.getAgoraToken(roomId)
      .then(res => {
        setAgoraToken(res.data.token);
        setAgoraAppId(res.data.app_id);
        setChannel(res.data.channel);
      })
      .catch(err => setFetchError(err.response?.data?.error || 'Failed to connect to media server'));
  }, [roomId]);

  if (fetchError) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <Text style={{ color: '#ef4444' }}>{fetchError}</Text>
      </div>
    );
  }

  if (!agoraToken) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <AgoraRTCProvider client={client}>
      <SpeakingRoom
        user={user}
        roomId={roomId}
        initialRoom={location.state?.room}
        initialMembers={location.state?.members}
        agoraAppId={agoraAppId}
        agoraToken={agoraToken}
        channel={channel}
      />
    </AgoraRTCProvider>
  );
}

function SpeakingRoom({ user, roomId, initialRoom, initialMembers, agoraAppId, agoraToken, channel }) {
  const navigate = useNavigate();

  const [room]    = useState(initialRoom || null);
  const [members, setMembers] = useState(initialMembers || []);

  const userId = user?.id || 0;
  const isHost = members.find(m => m.user_id === userId)?.role === 'host';

  const [micEnabled, setMicEnabled]         = useState(true);
  const [cameraEnabled, setCameraEnabled]   = useState(true);
  const [showLeave, setShowLeave]           = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [topic, setTopic]       = useState(initialRoom?.topic || 'Free Talk');
  const [showInvite, setShowInvite]         = useState(false);
  const [codeCopied, setCodeCopied]         = useState(false);

  // Remote media states received via WebSocket (supplements Agora's hasAudio/hasVideo)
  const [remoteMedia, setRemoteMedia] = useState({});

  const socketRef    = useRef(null);
  const isLeavingRef = useRef(false);

  // ── Room timer ─────────────────────────────────────────────────────────
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);
  const formatElapsed = (s) => {
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}:${String(m % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    return `${m}:${String(s % 60).padStart(2, '0')}`;
  };

  // ── Load real members on mount ──────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    roomAPI.getRoom(roomId)
      .then(res => setMembers(res.data.members || []))
      .catch(() => navigate('/room'));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ── Socket connection ──────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !userId) return;
    const socket = io('/room', { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_waiting_room', { room_id: roomId });
    });

    socket.on('member_joined', ({ member }) => {
      setMembers(prev => prev.find(m => m.user_id === member.user_id) ? prev : [...prev, member]);
    });

    socket.on('member_left', ({ user_id }) => {
      setMembers(prev => prev.filter(m => m.user_id !== user_id));
    });

    socket.on('host_changed', ({ new_host_user_id }) => {
      setMembers(prev =>
        prev.map(m => ({
          ...m,
          role: m.user_id === new_host_user_id ? 'host' : m.role === 'host' ? 'member' : m.role,
        }))
      );
    });

    socket.on('topic_changed', ({ topic: newTopic }) => setTopic(newTopic));

    socket.on('member_kicked', ({ user_id: kickedId }) => {
      if (kickedId === user?.id) {
        isLeavingRef.current = true;
        navigate('/room');
      }
    });

    socket.on('media_state_changed', ({ user_id: uid, mic_on, camera_on }) => {
      setRemoteMedia(prev => ({ ...prev, [uid]: { mic_on, camera_on } }));
    });

    return () => socket.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  // ── Browser back-button: call REST leave ──────────────────────────────────
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

  // ── Agora Integration ────────────────────────────────────────────────────
  // Join the channel — destructure isConnected so we can gate publishing
  const { isConnected, error: joinError } = useJoin({
    appid: agoraAppId,
    channel: channel,
    token: agoraToken,
    uid: userId, // Match our DB user_id
  }, true);

  // Always create local tracks (ready=true) so they stay alive across mute toggles.
  // Passing micEnabled/cameraEnabled as `ready` would destroy the track on mute,
  // preventing it from being published and causing remote users to never receive it.
  const { localMicrophoneTrack, ready: micReady } = useLocalMicrophoneTrack(true);
  const { localCameraTrack, ready: camReady } = useLocalCameraTrack(true);

  // Only publish after the channel is joined AND tracks are created.
  // Without this guard, usePublish may attempt to publish null tracks or publish
  // before join completes, causing remote users to never receive our streams.
  usePublish([localMicrophoneTrack, localCameraTrack], isConnected && micReady && camReady);

  // Get remote users
  const remoteUsers = useRemoteUsers();

  // Mute/unmute local tracks via setEnabled so the track stays published
  // but stops sending media data. setMuted only silences locally;
  // setEnabled actually stops the media stream to the remote side.
  useEffect(() => {
    if (localMicrophoneTrack) {
      localMicrophoneTrack.setEnabled(micEnabled);
    }
    // Broadcast media state change to other members via WebSocket
    socketRef.current?.emit('toggle_media', { room_id: roomId, mic_on: micEnabled, camera_on: cameraEnabled });
  }, [micEnabled, localMicrophoneTrack, roomId, cameraEnabled]);

  useEffect(() => {
    if (localCameraTrack) {
      localCameraTrack.setEnabled(cameraEnabled);
    }
    socketRef.current?.emit('toggle_media', { room_id: roomId, mic_on: micEnabled, camera_on: cameraEnabled });
  }, [cameraEnabled, localCameraTrack, roomId, micEnabled]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleChangeTopic = useCallback((newTopic) => {
    setTopic(newTopic);
    setShowTopicModal(false);
    socketRef.current?.emit('set_topic', { room_id: roomId, topic: newTopic });
  }, [roomId]);

  const handleLeave = useCallback(async () => {
    if (isHost && members.length > 1) {
      setShowLeave(true);
    } else {
      isLeavingRef.current = true;
      try { await roomAPI.leave(roomId, { summary: `Topic: ${topic}` }); } catch {}
      navigate('/room');
    }
  }, [isHost, members.length, roomId, navigate, topic]);

  const confirmLeave = useCallback(async () => {
    isLeavingRef.current = true;
    setShowLeave(false);
    try { await roomAPI.leave(roomId, { summary: `Topic: ${topic}` }); } catch {}
    navigate('/room');
  }, [roomId, navigate, topic]);

  const handleCopyCode = useCallback(() => {
    copyInviteCode(room?.invite_code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }, [room?.invite_code]);

  const handleKick = useCallback((targetUserId) => {
    socketRef.current?.emit('kick_member', { room_id: roomId, target_user_id: targetUserId });
  }, [roomId]);

  // Grid layout: 1 → 1 col, 2 → 2 cols, 3-4 → 2×2 grid
  const gridCols = members.length <= 1 ? 1 : 2;
  const tileSize = members.length <= 2 ? 280 : 200;

  return (
    <div style={{ height: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div style={{
        background: '#1a1a2e', padding: '0 24px', height: 52,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <Space size={10}>
          <Text strong style={{ color: '#f1f5f9', fontSize: 15 }}>{room?.name}</Text>
          <Tag color="#16a34a" style={{ borderRadius: 6 }}>Speaking Room</Tag>
        </Space>
        <Space size={8}>
          <Text style={{ color: '#94a3b8', fontSize: 12, fontFamily: 'monospace' }}>
            <ClockCircleOutlined style={{ marginRight: 4 }} />{formatElapsed(elapsed)}
          </Text>
          <Text style={{ color: '#64748b', fontSize: 12 }}>
            <TeamOutlined style={{ marginRight: 4 }} />{members.length} members
          </Text>
          <Popover
            open={showInvite}
            onOpenChange={setShowInvite}
            trigger="click"
            placement="bottomRight"
            content={
              <div style={{ width: 220 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Invite Code</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    flex: 1, fontFamily: 'monospace', fontSize: 22, fontWeight: 700,
                    letterSpacing: 4, textAlign: 'center',
                    background: '#f0f2f5', borderRadius: 8, padding: '8px 0',
                  }}>
                    {room?.invite_code || '------'}
                  </div>
                  <Button
                    icon={codeCopied ? <CheckOutlined /> : <LinkOutlined />}
                    onClick={handleCopyCode}
                    type={codeCopied ? 'primary' : 'default'}
                  >
                    {codeCopied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
              </div>
            }
          >
            <Button
              size="small"
              icon={<LinkOutlined />}
              style={{ background: 'transparent', borderColor: '#334155', color: '#94a3b8' }}
            >
              Invite
            </Button>
          </Popover>
        </Space>
      </div>

      {/* Topic Banner */}
      {topic && topic !== 'Free Talk' && (
        <div style={{
          background: '#1e3a5f', padding: '10px 24px',
          display: 'flex', alignItems: 'center', gap: 12,
          borderBottom: '1px solid #1e40af', flexShrink: 0,
        }}>
          <Tag color="blue" style={{ borderRadius: 6, fontWeight: 600 }}>Topic</Tag>
          <Text style={{ color: '#93c5fd', fontWeight: 500, flex: 1 }}>{topic}</Text>
          {isHost && (
            <Button
              size="small"
              onClick={() => setShowTopicModal(true)}
              style={{ background: 'transparent', borderColor: '#1e40af', color: '#60a5fa' }}
            >
              Change
            </Button>
          )}
        </div>
      )}
      {topic === 'Free Talk' && (
        <div style={{
          background: '#1e293b', padding: '6px 24px',
          display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: '1px solid #334155', flexShrink: 0,
        }}>
          <Tag style={{ borderRadius: 6, background: '#334155', borderColor: '#475569', color: '#94a3b8' }}>Free Talk</Tag>
          {isHost && (
            <Button
              size="small"
              type="link"
              onClick={() => setShowTopicModal(true)}
              style={{ color: '#60a5fa', padding: 0 }}
            >
              Set a topic
            </Button>
          )}
        </div>
      )}

      {/* Agora connection error banner */}
      {joinError && (
        <div style={{
          background: '#7f1d1d', padding: '8px 24px',
          display: 'flex', alignItems: 'center', gap: 8,
          borderBottom: '1px solid #991b1b', flexShrink: 0,
        }}>
          <Text style={{ color: '#fca5a5', fontSize: 13 }}>
            Media connection failed — video/audio will not work. Try refreshing the page.
          </Text>
        </div>
      )}

      {/* Video Grid */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gap: 8,
        padding: 16,
        alignContent: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
        {members.map(member => {
          const isMe = member.user_id === userId;

          // Find the corresponding Agora remote user
          const rtcUser = isMe ? null : remoteUsers.find(u => Number(u.uid) === member.user_id);
          // Use WebSocket media state as primary source, fall back to Agora SDK state
          const wsMedia = remoteMedia[member.user_id];
          const hasVideo = isMe ? cameraEnabled : (wsMedia ? wsMedia.camera_on : !!rtcUser?.hasVideo);
          const hasAudio = isMe ? micEnabled : (wsMedia ? wsMedia.mic_on : !!rtcUser?.hasAudio);

          return (
            <div
              key={member.user_id}
              style={{
                background: '#1e293b',
                borderRadius: 12,
                border: `1px solid ${isMe ? '#2563eb50' : '#334155'}`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: tileSize,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Local user: always render so own preview is visible */}
              {isMe && (
                <div style={{ position: 'absolute', inset: 0 }}>
                  <LocalUser
                    audioTrack={localMicrophoneTrack}
                    videoTrack={localCameraTrack}
                    cameraOn={cameraEnabled}
                    micOn={micEnabled}
                    playAudio={false} // Don't play own audio
                    playVideo={cameraEnabled}
                  />
                </div>
              )}

              {/* Remote user: ALWAYS render <RemoteUser> so Agora subscribes to
                  their audio/video tracks. Hiding it behind hasVideo would prevent
                  subscription entirely, causing black screens and no audio. */}
              {!isMe && rtcUser && (
                <div style={{ position: 'absolute', inset: 0 }}>
                  <RemoteUser
                    user={rtcUser}
                    playVideo={hasVideo}
                    playAudio={true}
                  />
                </div>
              )}

              {/* Avatar fallback when camera is off (local or remote) */}
              {!hasVideo && (
                <div style={{ textAlign: 'center', zIndex: 1 }}>
                  <Avatar
                    size={72}
                    style={{ background: getAvatarColor(member.username), fontSize: 28, fontWeight: 700 }}
                  >
                    {member.username.charAt(0).toUpperCase()}
                  </Avatar>
                </div>
              )}

              {/* Name + Role badges */}
              <div style={{
                position: 'absolute', bottom: 10, left: 10,
                display: 'flex', alignItems: 'center', gap: 6,
                zIndex: 2,
              }}>
                <div style={{
                  background: 'rgba(0,0,0,0.65)', borderRadius: 6, padding: '3px 8px',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  {member.role === 'host' && <CrownOutlined style={{ color: '#fbbf24', fontSize: 11 }} />}
                  <Text style={{ color: '#f1f5f9', fontSize: 12, fontWeight: 500 }}>
                    {member.username}{isMe ? ' (You)' : ''}
                  </Text>
                </div>
              </div>

              {/* Muted indicator */}
              {!hasAudio && (
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  background: 'rgba(239,68,68,0.85)', borderRadius: '50%',
                  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 2,
                }}>
                  <AudioMutedOutlined style={{ color: '#fff', fontSize: 11 }} />
                </div>
              )}

              {/* Host kick button */}
              {isHost && !isMe && member.role !== 'host' && (
                <Tooltip title="Remove from room">
                  <Button
                    size="small"
                    type="text"
                    onClick={() => Modal.confirm({
                      title: `Remove ${member.username}?`,
                      content: 'They will be removed from the room.',
                      okText: 'Remove',
                      okButtonProps: { danger: true },
                      onOk: () => handleKick(member.user_id),
                    })}
                    style={{
                      position: 'absolute', top: 8, right: 8,
                      color: '#94a3b8', fontSize: 11,
                      background: 'rgba(0,0,0,0.4)', borderRadius: 6,
                      padding: '2px 6px', lineHeight: 1, height: 'auto',
                      zIndex: 3,
                    }}
                  >
                    ✕
                  </Button>
                </Tooltip>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Controls */}
      <div style={{
        background: '#1e293b', borderTop: '1px solid #334155',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 16, flexShrink: 0,
      }}>
        <Space size={12}>
          {/* Mic */}
          <Tooltip title={micEnabled ? 'Mute' : 'Unmute'}>
            <Button
              shape="circle"
              size="large"
              icon={micEnabled ? <AudioOutlined /> : <AudioMutedOutlined />}
              onClick={() => setMicEnabled(v => !v)}
              style={{
                width: 52, height: 52,
                background: micEnabled ? '#334155' : '#dc2626',
                borderColor: micEnabled ? '#475569' : '#dc2626',
                color: '#fff', fontSize: 18,
              }}
            />
          </Tooltip>

          {/* Camera */}
          <Tooltip title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}>
            <Button
              shape="circle"
              size="large"
              icon={cameraEnabled ? <VideoCameraOutlined /> : <VideoCameraAddOutlined />}
              onClick={() => setCameraEnabled(v => !v)}
              style={{
                width: 52, height: 52,
                background: cameraEnabled ? '#334155' : '#dc2626',
                borderColor: cameraEnabled ? '#475569' : '#dc2626',
                color: '#fff', fontSize: 18,
              }}
            />
          </Tooltip>

          {/* Leave */}
          <Tooltip title="Leave room">
            <Button
              shape="circle"
              size="large"
              icon={<ArrowLeftOutlined />}
              onClick={handleLeave}
              style={{
                width: 52, height: 52,
                background: '#dc2626', borderColor: '#dc2626', color: '#fff', fontSize: 18,
              }}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Topic Selection Modal */}
      <Modal
        title="Select Topic"
        open={showTopicModal}
        onCancel={() => setShowTopicModal(false)}
        footer={null}
        width={400}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: '8px 0' }}>
          {TOPICS.map(t => (
            <Tag
              key={t}
              color={topic === t ? 'blue' : 'default'}
              style={{ cursor: 'pointer', padding: '4px 10px', fontSize: 13, borderRadius: 6 }}
              onClick={() => handleChangeTopic(t)}
            >
              {t}
            </Tag>
          ))}
        </div>
      </Modal>

      {/* Leave Confirmation */}
      <Modal
        title="Leave Room?"
        open={showLeave}
        onCancel={() => setShowLeave(false)}
        onOk={confirmLeave}
        okText="Leave"
        okButtonProps={{ danger: true }}
        width={360}
      >
        <Text>
          {isHost
            ? 'You are the host. Leaving will end the session for everyone.'
            : 'Are you sure you want to leave the session?'}
        </Text>
      </Modal>
    </div>
  );
}
