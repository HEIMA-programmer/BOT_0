import { Typography, Avatar, Button, Tooltip, Modal } from 'antd';
import { AudioMutedOutlined, CrownOutlined } from '@ant-design/icons';
import { RemoteUser, LocalUser } from 'agora-rtc-react';
import { getAvatarColor } from '../../../utils/roomUtils';

const { Text } = Typography;

export default function VideoTile({
  member, isMe, isHost, tileSize,
  // Local user props
  localMicrophoneTrack, localCameraTrack, micEnabled, cameraEnabled,
  // Remote user props
  rtcUser, hasVideo, hasAudio,
  // Host actions
  onKick,
}) {
  return (
    <div
      style={{
        background: '#1e293b',
        borderRadius: 12,
        border: `1px solid ${isMe ? '#2563eb50' : '#334155'}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: tileSize,
        aspectRatio: '16 / 9',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Local user */}
      {isMe && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <LocalUser
            audioTrack={localMicrophoneTrack}
            videoTrack={localCameraTrack}
            cameraOn={cameraEnabled}
            micOn={micEnabled}
            playAudio={false}
            playVideo={cameraEnabled}
          />
        </div>
      )}

      {/* Remote user: ALWAYS render so Agora subscribes to their tracks */}
      {!isMe && rtcUser && (
        <div style={{ position: 'absolute', inset: 0 }}>
          <RemoteUser user={rtcUser} playVideo={hasVideo} playAudio={true} />
        </div>
      )}

      {/* Avatar fallback when camera is off */}
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
        display: 'flex', alignItems: 'center', gap: 6, zIndex: 2,
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
              onOk: () => onKick(member.user_id),
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
}
