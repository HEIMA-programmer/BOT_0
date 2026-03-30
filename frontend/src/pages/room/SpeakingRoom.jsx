import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Typography, Button, Tag, Modal, Space, Avatar, Tooltip } from 'antd';
import {
  AudioOutlined, AudioMutedOutlined, VideoCameraOutlined,
  VideoCameraAddOutlined, ArrowLeftOutlined,
  CrownOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

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

const MOCK_ROOM = { id: 'demo', name: "Alice's Speaking Room", type: 'speaking', hostId: 1, topic: 'Daily Campus Life' };
const MOCK_MEMBERS = [
  { id: 1, username: 'Alice', role: 'host' },
  { id: 2, username: 'Bob', role: 'member' },
  { id: 3, username: 'Carol', role: 'member' },
  { id: 0, username: 'You', role: 'member' },
];

export default function SpeakingRoom({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { room: r, members: m } = location.state || {};
  const room = r || MOCK_ROOM;
  const members = m || MOCK_MEMBERS;

  const userId = user?.id || 0;
  const isHost = room.hostId === userId;

  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [showLeave, setShowLeave] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [topic, setTopic] = useState(room.topic || 'Free Talk');


  const handleLeave = useCallback(() => {
    if (isHost && members.length > 1) {
      setShowLeave(true);
    } else {
      navigate('/room');
    }
  }, [isHost, members.length, navigate]);

  // Grid layout: 1 → 1 col, 2 → 2 cols, 3-4 → 2×2 grid
  const gridCols = members.length <= 1 ? 1 : members.length === 2 ? 2 : 2;
  const tileSize = members.length <= 2 ? 280 : 200;

  return (
    <div style={{ height: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
          const isMe = member.id === userId || (userId === 0 && member.username === 'You');
          return (
            <div
              key={member.id}
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
              {/* Camera off state — shows avatar */}
              {(!cameraEnabled && isMe) || (!isMe) ? (
                <div style={{ textAlign: 'center' }}>
                  <Avatar
                    size={72}
                    style={{ background: getAvatarColor(member.username), fontSize: 28, fontWeight: 700 }}
                  >
                    {member.username.charAt(0).toUpperCase()}
                  </Avatar>
                </div>
              ) : (
                // Camera on state — teal gradient placeholder
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `linear-gradient(135deg, ${getAvatarColor(member.username)}40, #0f172a)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
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
              {isMe && !micEnabled && (
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  background: 'rgba(239,68,68,0.85)', borderRadius: '50%',
                  width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <AudioMutedOutlined style={{ color: '#fff', fontSize: 11 }} />
                </div>
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

      {/* Leave Confirmation */}
      <Modal
        title="Leave Room?"
        open={showLeave}
        onCancel={() => setShowLeave(false)}
        onOk={() => navigate('/room')}
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
