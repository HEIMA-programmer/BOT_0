import { Button, Tooltip, Space } from 'antd';
import {
  AudioOutlined, AudioMutedOutlined,
  VideoCameraOutlined, VideoCameraAddOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';

export default function BottomControls({ micEnabled, cameraEnabled, onToggleMic, onToggleCamera, onLeave }) {
  return (
    <div style={{
      background: '#1e293b', borderTop: '1px solid #334155',
      padding: '14px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: 16, flexShrink: 0,
    }}>
      <Space size={12}>
        <Tooltip title={micEnabled ? 'Mute' : 'Unmute'}>
          <Button
            shape="circle"
            size="large"
            icon={micEnabled ? <AudioOutlined /> : <AudioMutedOutlined />}
            onClick={onToggleMic}
            style={{
              width: 52, height: 52,
              background: micEnabled ? '#334155' : '#dc2626',
              borderColor: micEnabled ? '#475569' : '#dc2626',
              color: '#fff', fontSize: 18,
            }}
          />
        </Tooltip>

        <Tooltip title={cameraEnabled ? 'Turn off camera' : 'Turn on camera'}>
          <Button
            shape="circle"
            size="large"
            icon={cameraEnabled ? <VideoCameraOutlined /> : <VideoCameraAddOutlined />}
            onClick={onToggleCamera}
            style={{
              width: 52, height: 52,
              background: cameraEnabled ? '#334155' : '#dc2626',
              borderColor: cameraEnabled ? '#475569' : '#dc2626',
              color: '#fff', fontSize: 18,
            }}
          />
        </Tooltip>

        <Tooltip title="Leave room">
          <Button
            shape="circle"
            size="large"
            icon={<ArrowLeftOutlined />}
            onClick={onLeave}
            style={{
              width: 52, height: 52,
              background: '#dc2626', borderColor: '#dc2626', color: '#fff', fontSize: 18,
            }}
          />
        </Tooltip>
      </Space>
    </div>
  );
}
