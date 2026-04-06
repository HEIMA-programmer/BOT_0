import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Typography, Button, Input, Avatar, Modal, Tooltip, Space, Tag,
  App as AntdApp, Popover, Row, Col,
} from 'antd';
import {
  PlayCircleOutlined, PauseOutlined,
  TeamOutlined, SendOutlined, ArrowLeftOutlined,
  FolderOpenOutlined, LinkOutlined, CheckOutlined,
  CrownOutlined, ClockCircleOutlined,
} from '@ant-design/icons';
import { io } from 'socket.io-client';
import { roomAPI } from '../../api/index';
import { getAvatarColor, copyInviteCode } from '../../utils/roomUtils';
import { friendsAPI } from '../../api/index';
import { videoCategories } from '../../data/videos';

const { Text } = Typography;

const getYouTubeId = (url) => {
  const m = url?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
  return m?.[1];
};

export default function WatchTogether({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: roomIdParam } = useParams();
  const { message } = AntdApp.useApp();

  const { room: initialRoom, members: initialMembers, autoSelectVideo } = location.state || {};
  const [room, setRoom]   = useState(initialRoom || null);
  const [members, setMembers] = useState(initialMembers || []);
  const membersRef = useRef(initialMembers || []);
  useEffect(() => { membersRef.current = members; }, [members]);

  const userId = user?.id || 0;
  const roomId = room?.id ? Number(room.id) : Number(roomIdParam);
  const isHost = members.find(m => m.user_id === userId)?.role === 'host';
  const isHostRef = useRef(isHost);
  const roomIdRef = useRef(roomId);
  useEffect(() => { isHostRef.current = isHost; }, [isHost]);
  useEffect(() => { roomIdRef.current = roomId; }, [roomId]);

  // Content + playback
  const [content, setContent]       = useState(null);
  const [isPlaying, setIsPlaying]   = useState(false);
  const [position, setPosition]     = useState(0);
  const [duration, setDuration]     = useState(0);
  const playerContainerRef = useRef(null);
  const playerRef     = useRef(null);
  const playerReady   = useRef(false);
  const timeIntervalRef = useRef(null);
  const isSyncingRef  = useRef(false);
  const pendingSyncRef = useRef(null);

  // Content selection modal
  const [showContent, setShowContent] = useState(false);

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
  const autoSelectDone = useRef(false);

  // ── YouTube player helpers ────────────────────────────────────────────────
  const isPlayerPlaying = () => {
    try { return playerRef.current?.getPlayerState?.() === 1; } catch { return false; }
  };

  const applySync = useCallback((data) => {
    if (!playerRef.current || !playerReady.current) {
      pendingSyncRef.current = data;
      return;
    }
    isSyncingRef.current = true;
    try {
      const curTime = playerRef.current.getCurrentTime?.() || 0;
      if (Math.abs(curTime - data.position) > 2) {
        playerRef.current.seekTo(data.position, true);
      }
      if (data.is_playing) {
        playerRef.current.playVideo();
        setIsPlaying(true);
      } else {
        playerRef.current.pauseVideo();
        setIsPlaying(false);
      }
    } catch { /* player not ready */ }
    setTimeout(() => { isSyncingRef.current = false; }, 200);
  }, []);

  const createPlayer = useCallback((videoId) => {
    if (!playerContainerRef.current) return;
    // Destroy previous
    if (playerRef.current) {
      try { playerRef.current.destroy(); } catch { /* ignored */ }
      playerRef.current = null;
      playerReady.current = false;
    }
    if (timeIntervalRef.current) {
      clearInterval(timeIntervalRef.current);
      timeIntervalRef.current = null;
    }
    // Reset container — YT.Player replaces the target element
    playerContainerRef.current.innerHTML = '<div id="wt-yt-player"></div>';

    playerRef.current = new window.YT.Player('wt-yt-player', {
      videoId,
      width: '100%',
      height: '100%',
      playerVars: { enablejsapi: 1, rel: 0 },
      events: {
        onReady: () => {
          playerReady.current = true;
          // Start time tracking
          timeIntervalRef.current = setInterval(() => {
            if (!playerRef.current?.getCurrentTime) return;
            try {
              setPosition(playerRef.current.getCurrentTime());
              const d = playerRef.current.getDuration?.();
              if (d) setDuration(d);
            } catch { /* ignored */ }
          }, 500);
          // Apply any queued sync
          if (pendingSyncRef.current) {
            applySync(pendingSyncRef.current);
            pendingSyncRef.current = null;
          }
        },
        onStateChange: (event) => {
          if (!playerRef.current?.getCurrentTime) return;
          try { setPosition(playerRef.current.getCurrentTime()); } catch { /* ignored */ }
          // Host: sync YouTube native play/pause to other members
          const state = event.data; // 1=playing, 2=paused
          if (isHostRef.current && !isSyncingRef.current && (state === 1 || state === 2)) {
            const playing = state === 1;
            setIsPlaying(playing);
            socketRef.current?.emit('sync_playback', {
              room_id:    roomIdRef.current,
              is_playing: playing,
              position:   playerRef.current.getCurrentTime?.() || 0,
            });
          }
        },
      },
    });
  }, [applySync]);

  // Load YT API once
  useEffect(() => {
    if (window.YT?.Player) return;
    if (!document.querySelector('script[src*="youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      document.head.appendChild(tag);
    }
  }, []);

  // (Re-)init player whenever content changes
  useEffect(() => {
    if (!content?.video_url) return;
    const ytId = getYouTubeId(content.video_url);
    if (!ytId) return;

    const tryCreate = () => {
      if (window.YT?.Player) {
        createPlayer(ytId);
      } else {
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => { prev?.(); createPlayer(ytId); };
      }
    };
    // Small delay to let container render
    const timer = setTimeout(tryCreate, 100);
    return () => clearTimeout(timer);
  }, [content?.video_url, createPlayer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeIntervalRef.current) clearInterval(timeIntervalRef.current);
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch { /* ignored */ }
        playerRef.current = null;
      }
    };
  }, []);

  // ── Load room data on mount ───────────────────────────────────────────────
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
      applySync(data);
    });

    socket.on('comment_received', (comment) => {
      setComments(prev => [...prev, comment]);
    });

    socket.on('room_error', ({ message: errMsg }) => {
      message.error(errMsg);
    });

    return () => { socket.disconnect(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  // ── Auto-select video if created from VideoPlayer ────────────────────────
  useEffect(() => {
    if (!autoSelectVideo || !socketRef.current || autoSelectDone.current) return;
    autoSelectDone.current = true;
    // Small delay for socket to connect
    setTimeout(() => {
      socketRef.current?.emit('select_content', {
        room_id:    roomId,
        title:      autoSelectVideo.title,
        video_url:  autoSelectVideo.url,
        categoryId: autoSelectVideo.categoryId,
        videoId:    autoSelectVideo.videoId,
      });
    }, 500);
  }, [autoSelectVideo, roomId]);

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
  const handleSelectContent = useCallback((video, categoryId) => {
    socketRef.current?.emit('select_content', {
      room_id:    roomId,
      title:      video.title,
      video_url:  video.url,
      categoryId,
      videoId:    video.id,
    });
    setShowContent(false);
  }, [roomId]);

  // ── Playback controls (host only) ────────────────────────────────────────
  const handlePlayPause = useCallback(() => {
    if (!isHost || !content || !playerRef.current) return;
    try {
      const willPlay = !isPlayerPlaying();
      if (willPlay) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
      setIsPlaying(willPlay);
      socketRef.current?.emit('sync_playback', {
        room_id:    roomId,
        is_playing: willPlay,
        position:   playerRef.current.getCurrentTime?.() || 0,
      });
    } catch { /* player not ready */ }
  }, [isHost, content, roomId]);

  const handleSeek = useCallback((e) => {
    if (!isHost || !duration || !playerRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const newPos = ((e.clientX - rect.left) / rect.width) * duration;
    try {
      playerRef.current.seekTo(newPos, true);
      setPosition(newPos);
      socketRef.current?.emit('sync_playback', {
        room_id:    roomId,
        is_playing: isPlaying,
        position:   newPos,
      });
    } catch { /* player not ready */ }
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
    try { await roomAPI.leave(roomId, { summary }); } catch { /* ignored */ }
    navigate('/room');
  }, [roomId, navigate, content]);

  const formatTime = (secs) => {
    const s = Math.floor(secs || 0);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };

  if (!room) return null;

  const ytId = content?.video_url ? getYouTubeId(content.video_url) : null;

  return (
    <div style={{ height: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

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

        {/* Video Player Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

          {/* Video display */}
          <div style={{
            flex: 1, background: '#000', display: 'flex', alignItems: 'center',
            justifyContent: 'center',
          }}>
            {content && ytId ? (
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                <div
                  ref={playerContainerRef}
                  style={{ width: '100%', height: '100%' }}
                >
                  <div id="wt-yt-player" />
                </div>
                {/* Overlay for non-host to prevent direct interaction */}
                {!isHost && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
                    background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
                    display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 8,
                  }}>
                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>Controlled by host</Text>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <PlayCircleOutlined style={{ fontSize: 56, color: '#334155' }} />
                <Text style={{ display: 'block', color: '#475569', marginTop: 12, fontSize: 14 }}>
                  {isHost ? 'Select a video to start watching together' : 'Waiting for host to select a video...'}
                </Text>
                {isHost && (
                  <Button
                    type="primary"
                    icon={<FolderOpenOutlined />}
                    onClick={() => setShowContent(true)}
                    style={{ marginTop: 16 }}
                  >
                    Select Video
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
              {content && (
                <Text ellipsis style={{ color: '#94a3b8', fontSize: 12, maxWidth: 200 }}>
                  {content.title}
                </Text>
              )}
              {isHost && content && (
                <Button
                  size="small"
                  icon={<FolderOpenOutlined />}
                  onClick={() => setShowContent(true)}
                  style={{ background: 'transparent', borderColor: '#475569', color: '#94a3b8' }}
                >
                  Change
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Members Panel — overlay */}
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

      {/* Video Selection Modal */}
      <Modal
        title="Select a Video"
        open={showContent}
        onCancel={() => setShowContent(false)}
        footer={null}
        width={680}
      >
        <div style={{ maxHeight: 480, overflowY: 'auto' }}>
          {videoCategories.map(category => (
            <div key={category.id}>
              <Text strong style={{ display: 'block', marginBottom: 12, fontSize: 15 }}>
                {category.title}
              </Text>
              <Row gutter={[12, 12]}>
                {category.videos.map(video => (
                  <Col xs={24} sm={12} key={video.id}>
                    <div
                      onClick={() => handleSelectContent(video, category.id)}
                      style={{
                        display: 'flex', gap: 10, padding: 10, borderRadius: 10,
                        border: '1px solid #e5e7eb', cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f0f9ff'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <div style={{
                        width: 100, height: 56, borderRadius: 8, overflow: 'hidden',
                        background: '#f3f4f6', flexShrink: 0, position: 'relative',
                      }}>
                        <img
                          src={video.thumbnail}
                          alt=""
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={e => e.target.style.display = 'none'}
                        />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text strong style={{ fontSize: 13, display: 'block' }} ellipsis>
                          {video.title}
                        </Text>
                        <Tag icon={<ClockCircleOutlined />} style={{ fontSize: 11, marginTop: 4 }}>
                          {video.duration}
                        </Tag>
                      </div>
                    </div>
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </div>
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
