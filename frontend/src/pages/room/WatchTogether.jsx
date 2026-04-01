import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Typography, Button, Input, Avatar, Modal, Tooltip, Space, Tag,
  App as AntdApp, Spin, Popover,
} from 'antd';
import {
  PlayCircleOutlined, PauseOutlined, SoundOutlined,
  TeamOutlined, SendOutlined, ArrowLeftOutlined,
  FolderOpenOutlined, LoadingOutlined, LinkOutlined, CheckOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { io } from 'socket.io-client';
import { roomAPI, listeningAPI } from '../../api/index';
import { getAvatarColor, copyInviteCode } from '../../utils/roomUtils';
import { friendsAPI } from '../../api/index';

const { Text } = Typography;

export default function WatchTogether({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: roomIdParam } = useParams();
  const { message } = AntdApp.useApp();

  const { room: initialRoom, members: initialMembers } = location.state || {};
  const [room, setRoom]   = useState(initialRoom || null);
  const [members, setMembers] = useState(initialMembers || []);
  const membersRef = useRef(initialMembers || []);
  useEffect(() => { membersRef.current = members; }, [members]);

  const userId = user?.id || 0;
  const roomId = room?.id ? Number(room.id) : Number(roomIdParam);
  const isHost = members.find(m => m.user_id === userId)?.role === 'host';

  // Content + playback
  const [content, setContent]       = useState(null);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [position, setPosition]     = useState(0);
  const [duration, setDuration]     = useState(0);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const audioRef     = useRef(null);
  const isSyncingRef = useRef(false);

  // Content selection modal
  const [showContent, setShowContent]   = useState(false);
  const [catalog, setCatalog]           = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(false);

  // Comments
  const [comments, setComments]         = useState([]);
  const [commentInput, setCommentInput] = useState('');
  const commentsEndRef = useRef(null);

  // UI
  const [showMembers, setShowMembers] = useState(false);
  const [showLeave, setShowLeave]     = useState(false);
  const [showInvite, setShowInvite]   = useState(false);
  const [friendsList, setFriendsList] = useState([]);
  const [invitedFriends, setInvitedFriends] = useState(new Set());
  const [codeCopied, setCodeCopied]   = useState(false);

  const socketRef    = useRef(null);
  const isLeavingRef = useRef(false);

  // ── Load room data on mount (handles refresh + mid-session join) ─────────
  useEffect(() => {
    if (!roomId) return;
    roomAPI.getRoom(roomId)
      .then(res => {
        setRoom(res.data.room);
        setMembers(res.data.members || []);
      })
      .catch(() => {
        message.error('Room not found');
        navigate('/room');
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ── Socket connection ────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !userId) return;

    const socket = io('/room', { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_waiting_room', { room_id: roomId });
    });

    socket.on('member_joined', ({ member }) => {
      setMembers(prev =>
        prev.find(m => m.user_id === member.user_id) ? prev : [...prev, member]
      );
      setComments(prev => [...prev, { system: true, text: `${member.username} joined` }]);
    });

    socket.on('member_left', ({ user_id }) => {
      const leaving = membersRef.current.find(m => m.user_id === user_id);
      if (leaving) {
        setComments(c => [...c, { system: true, text: `${leaving.username} left` }]);
      }
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

    socket.on('member_kicked', ({ user_id: kickedId }) => {
      if (kickedId === user?.id) {
        isLeavingRef.current = true;
        navigate('/room');
      }
    });

    socket.on('content_selected', (data) => {
      setContent(data);
      setIsPlaying(false);
      setPosition(0);
    });

    socket.on('playback_synced', (data) => {
      if (!audioRef.current) return;
      isSyncingRef.current = true;
      if (Math.abs(audioRef.current.currentTime - data.position) > 1.5) {
        audioRef.current.currentTime = data.position;
      }
      if (data.is_playing && audioRef.current.paused) {
        // Only call play() if the user has already unlocked audio via a gesture.
        // If not yet unlocked, just update state — the unlock overlay's onClick
        // will call play() when the user taps it.
        audioRef.current.play().then(() => {
          setAudioUnlocked(true);
          setIsPlaying(true);
        }).catch(() => {
          // Autoplay blocked — show unlock overlay
          setIsPlaying(true); // track intended state
        });
      } else if (!data.is_playing && !audioRef.current.paused) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
      setTimeout(() => { isSyncingRef.current = false; }, 150);
    });

    socket.on('comment_received', (comment) => {
      setComments(prev => [...prev, comment]);
    });

    socket.on('room_error', ({ message: errMsg }) => {
      message.error(errMsg);
    });

    return () => {
      socket.disconnect();
    };
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

  // Auto-scroll comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // ── Content selection ────────────────────────────────────────────────────
  const openContentModal = useCallback(() => {
    setShowContent(true);
    if (catalog.length === 0) {
      setCatalogLoading(true);
      listeningAPI.getCatalog()
        .then(res => {
          // Flatten: levels → scenarios → clips
          const clips = [];
          (res.data.levels || []).forEach(level => {
            (level.scenarios || []).forEach(scenario => {
              (scenario.clips || []).forEach(clip => {
                clips.push({ ...clip, level_label: level.label, scenario_label: scenario.label });
              });
            });
          });
          setCatalog(clips);
        })
        .catch(() => message.error('Failed to load content'))
        .finally(() => setCatalogLoading(false));
    }
  }, [catalog.length, message]);

  const handleSelectContent = useCallback((clip) => {
    socketRef.current?.emit('select_content', {
      room_id:     roomId,
      title:       clip.title,
      audio_url:   clip.audio_url,
      source_slug: clip.source_slug,
    });
    setShowContent(false);
  }, [roomId]);

  // ── Playback controls (host only) ────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    if (!isHost || !content || !audioRef.current) return;
    const willPlay = audioRef.current.paused;
    if (willPlay) {
      audioRef.current.play().catch(() => {});
    } else {
      audioRef.current.pause();
    }
    setIsPlaying(willPlay);
    socketRef.current?.emit('sync_playback', {
      room_id:    roomId,
      is_playing: willPlay,
      position:   audioRef.current.currentTime,
    });
  }, [isHost, content, roomId]);

  const handleSeek = useCallback((e) => {
    if (!isHost || !duration || !audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const newPos = ((e.clientX - rect.left) / rect.width) * duration;
    audioRef.current.currentTime = newPos;
    setPosition(newPos);
    socketRef.current?.emit('sync_playback', {
      room_id:    roomId,
      is_playing: isPlaying,
      position:   newPos,
    });
  }, [isHost, duration, isPlaying, roomId]);

  // ── Comments ─────────────────────────────────────────────────────────────
  const handleSendComment = useCallback(() => {
    const text = commentInput.trim();
    if (!text) return;
    socketRef.current?.emit('send_comment', { room_id: roomId, text });
    setCommentInput('');
  }, [commentInput, roomId]);

  const handleCopyCode = useCallback(() => {
    copyInviteCode(room?.invite_code).then(() => {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    });
  }, [room?.invite_code]);

  // ── Leave ─────────────────────────────────────────────────────────────────
  const handleLeave = useCallback(async () => {
    isLeavingRef.current = true;
    const summary = content?.title ? `Watched: ${content.title}` : '';
    try { await roomAPI.leave(roomId, { summary }); } catch {}
    navigate('/room');
  }, [roomId, navigate, content]);

  const formatTime = (secs) => {
    const s = Math.floor(secs || 0);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  if (!room) return null;

  return (
    <div style={{ height: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Hidden audio element */}
      {content?.audio_url && (
        <audio
          ref={audioRef}
          src={content.audio_url}
          onTimeUpdate={() => {
            if (!isSyncingRef.current && audioRef.current) {
              setPosition(audioRef.current.currentTime);
            }
          }}
          onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Top Bar */}
      <div style={{
        height: 52, background: '#1e293b', display: 'flex', alignItems: 'center',
        padding: '0 20px', gap: 12, borderBottom: '1px solid #334155', flexShrink: 0,
      }}>
        <Button
          icon={<ArrowLeftOutlined />}
          size="small"
          onClick={() => setShowLeave(true)}
          style={{ background: 'transparent', borderColor: '#475569', color: '#94a3b8' }}
        >
          Leave
        </Button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
          <PlayCircleOutlined style={{ color: '#60a5fa' }} />
          <Text style={{ color: '#f1f5f9', fontWeight: 600, fontSize: 14 }}>{room.name}</Text>
          <Tag color="blue" style={{ borderRadius: 6, fontSize: 11 }}>Watch Together</Tag>
        </div>
        <Tooltip title="Members">
          <Button
            icon={<TeamOutlined />}
            size="small"
            onClick={() => setShowMembers(v => !v)}
            style={{
              background: showMembers ? '#2563eb' : 'transparent',
              borderColor: '#475569', color: showMembers ? '#fff' : '#94a3b8',
            }}
          >
            {members.length}
          </Button>
        </Tooltip>
        <Popover
          open={showInvite}
          onOpenChange={(open) => {
            setShowInvite(open);
            if (open && friendsList.length === 0) {
              friendsAPI.list().then(res => setFriendsList(res.data.friends || [])).catch(() => {});
            }
          }}
          trigger="click"
          placement="bottomRight"
          content={
            <div style={{ width: 280 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>Invite Code</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
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
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                Invite Friends Directly
              </Text>
              {friendsList.length > 0 ? (
                <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {friendsList.map(f => {
                    const alreadyInRoom = members?.some(m => m.user_id === f.friend_id);
                    const alreadyInvited = invitedFriends.has(f.friend_id);
                    return (
                      <div key={f.friend_id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                        <Avatar size={24} style={{ backgroundColor: '#2563eb', fontSize: 11 }}>
                          {f.friend_username?.charAt(0)?.toUpperCase()}
                        </Avatar>
                        <Text style={{ flex: 1, fontSize: 13 }}>{f.friend_username}</Text>
                        {alreadyInRoom ? (
                          <Tag color="green" style={{ fontSize: 11 }}>In Room</Tag>
                        ) : alreadyInvited ? (
                          <Tag color="blue" style={{ fontSize: 11 }}>Invited</Tag>
                        ) : (
                          <Button
                            size="small"
                            type="link"
                            onClick={() => {
                              socketRef.current?.emit('invite_friend', { room_id: roomId, target_user_id: f.friend_id });
                              setInvitedFriends(prev => new Set([...prev, f.friend_id]));
                            }}
                          >
                            Invite
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>No friends to invite</Text>
              )}
            </div>
          }
        >
          <Button
            size="small"
            icon={<LinkOutlined />}
            style={{ background: 'transparent', borderColor: '#475569', color: '#94a3b8' }}
          >
            Invite
          </Button>
        </Popover>
      </div>

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Audio Player Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* Content display */}
          <div style={{
            flex: 1, background: '#000', display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: 32,
          }}>
            {content ? (
              <div style={{ textAlign: 'center', maxWidth: 480 }}>
                <div style={{
                  width: 96, height: 96, background: '#1e293b', borderRadius: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                  border: isPlaying ? '2px solid #2563eb' : '2px solid #334155',
                }}>
                  <SoundOutlined style={{ fontSize: 40, color: isPlaying ? '#60a5fa' : '#475569' }} />
                </div>
                <Text style={{ color: '#f1f5f9', fontSize: 17, fontWeight: 600, display: 'block', marginBottom: 8 }}>
                  {content.title}
                </Text>
                {!isHost && !audioUnlocked && isPlaying && (
                  <Button
                    type="primary"
                    icon={<SoundOutlined />}
                    onClick={() => {
                      audioRef.current?.play().catch(() => {});
                      setAudioUnlocked(true);
                    }}
                    style={{ marginTop: 8 }}
                  >
                    Tap to hear audio
                  </Button>
                )}
                {!isHost && audioUnlocked && (
                  <Text style={{ color: '#64748b', fontSize: 12 }}>Controlled by host</Text>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <PlayCircleOutlined style={{ fontSize: 56, color: '#334155' }} />
                <Text style={{ display: 'block', color: '#475569', marginTop: 12, fontSize: 14 }}>
                  {isHost ? 'Select content to start watching together' : 'Waiting for host to select content...'}
                </Text>
                {isHost && (
                  <Button
                    type="primary"
                    icon={<FolderOpenOutlined />}
                    onClick={openContentModal}
                    style={{ marginTop: 16 }}
                  >
                    Select Content
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Playback Controls */}
          <div style={{ background: '#1e293b', padding: '12px 20px', borderTop: '1px solid #334155' }}>
            {/* Progress bar */}
            <div
              style={{
                height: 4, background: '#334155', borderRadius: 2, marginBottom: 10,
                cursor: isHost && content ? 'pointer' : 'default',
              }}
              onClick={handleSeek}
            >
              <div style={{
                height: '100%',
                width: `${duration ? (position / duration) * 100 : 0}%`,
                background: '#2563eb', borderRadius: 2, transition: 'width 0.3s linear',
              }} />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <Button
                type="text"
                icon={isPlaying ? <PauseOutlined /> : <PlayCircleOutlined />}
                onClick={handlePlayPause}
                disabled={!isHost || !content}
                style={{ color: isHost && content ? '#f1f5f9' : '#475569', fontSize: 18, padding: '0 4px' }}
              />
              <Text style={{ color: '#64748b', fontSize: 12, minWidth: 90 }}>
                {formatTime(position)} / {formatTime(duration)}
              </Text>
              <div style={{ flex: 1 }} />
              {isHost && content && (
                <Button
                  size="small"
                  icon={<FolderOpenOutlined />}
                  onClick={openContentModal}
                  style={{ background: 'transparent', borderColor: '#475569', color: '#94a3b8' }}
                >
                  Change
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Members Panel — overlay, does not push content */}
        {showMembers && (
          <div style={{
            position: 'absolute', top: 0, left: 0, bottom: 0,
            width: 200, background: 'rgba(30,41,59,0.95)', borderRight: '1px solid #334155',
            padding: '16px 12px', overflowY: 'auto', zIndex: 10,
            backdropFilter: 'blur(8px)',
          }}>
            <Text style={{
              color: '#64748b', fontSize: 11, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 12,
            }}>
              Members
            </Text>
            {members.map(m => (
              <div key={m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Avatar size={28} style={{ background: getAvatarColor(m.username), fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {m.username.charAt(0).toUpperCase()}
                </Avatar>
                <Text style={{ color: '#e2e8f0', fontSize: 13, flex: 1 }} ellipsis>{m.username}</Text>
                {m.role === 'host' && <CrownOutlined style={{ color: '#fbbf24', fontSize: 12 }} />}
              </div>
            ))}
          </div>
        )}

        {/* Comment Panel */}
        <div style={{
          width: 300, background: '#1e293b', borderLeft: '1px solid #334155',
          display: 'flex', flexDirection: 'column', flexShrink: 0,
        }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #334155', flexShrink: 0 }}>
            <Text style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>Live Comments</Text>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
            {comments.length === 0 && (
              <Text style={{ color: '#475569', fontSize: 13 }}>No comments yet...</Text>
            )}
            {comments.map((c, i) => (
              c.system ? (
                <div key={i} style={{ textAlign: 'center', marginBottom: 10 }}>
                  <Text style={{ color: '#475569', fontSize: 11, fontStyle: 'italic' }}>{c.text}</Text>
                </div>
              ) : (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                  <Avatar size={18} style={{ background: getAvatarColor(c.username), fontSize: 9, fontWeight: 700 }}>
                    {c.username.charAt(0).toUpperCase()}
                  </Avatar>
                  <Text style={{ color: '#60a5fa', fontSize: 12, fontWeight: 600 }}>{c.username}</Text>
                  <Text style={{ color: '#475569', fontSize: 11, marginLeft: 'auto' }}>{c.time}</Text>
                </div>
                <Text style={{ color: '#cbd5e1', fontSize: 13, paddingLeft: 24, display: 'block', lineHeight: '1.4' }}>
                  {c.text}
                </Text>
              </div>
              )
            ))}
            <div ref={commentsEndRef} />
          </div>
          <div style={{ padding: '12px', borderTop: '1px solid #334155', flexShrink: 0 }}>
            <Space.Compact style={{ width: '100%' }}>
              <Input
                placeholder="Say something..."
                value={commentInput}
                onChange={e => setCommentInput(e.target.value)}
                onPressEnter={handleSendComment}
                style={{ background: '#0f172a', borderColor: '#334155', color: '#e2e8f0' }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSendComment}
                disabled={!commentInput.trim()}
              />
            </Space.Compact>
          </div>
        </div>
      </div>

      {/* Content Selection Modal */}
      <Modal
        title="Select Content"
        open={showContent}
        onCancel={() => setShowContent(false)}
        footer={null}
        width={560}
      >
        {catalogLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Spin indicator={<LoadingOutlined style={{ fontSize: 28 }} spin />} />
          </div>
        ) : (
          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {catalog.map(clip => (
              <div
                key={clip.id}
                onClick={() => handleSelectContent(clip)}
                style={{
                  padding: '12px 14px', borderRadius: 8, cursor: 'pointer',
                  border: '1px solid #e5e7eb', marginBottom: 8,
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                onMouseLeave={e => e.currentTarget.style.background = ''}
              >
                <Text strong style={{ display: 'block', fontSize: 13 }}>{clip.title}</Text>
                <Space size={6} style={{ marginTop: 4 }}>
                  <Tag color="blue" style={{ fontSize: 11 }}>{clip.level_label}</Tag>
                  <Tag style={{ fontSize: 11 }}>{clip.scenario_label}</Tag>
                </Space>
              </div>
            ))}
            {catalog.length === 0 && !catalogLoading && (
              <Text type="secondary">No content available.</Text>
            )}
          </div>
        )}
      </Modal>

      {/* Leave Modal */}
      <Modal
        title="Leave Room?"
        open={showLeave}
        onCancel={() => setShowLeave(false)}
        onOk={handleLeave}
        okText="Leave"
        okButtonProps={{ danger: true }}
        width={340}
      >
        <Text>Are you sure you want to leave the watch session?</Text>
      </Modal>
    </div>
  );
}
