import { Button, Slider, Space, Typography } from 'antd';
import { SoundOutlined, PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useRef, useState } from 'react';

const { Text } = Typography;

export default function AudioPlayer({ src, title }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setProgress(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleSliderChange = (value) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = value;
    setProgress(value);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ padding: '12px 16px', background: '#fafafa', borderRadius: 8 }}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setPlaying(false)}
      />
      {title && <Text strong style={{ marginBottom: 8, display: 'block' }}>{title}</Text>}
      <Space style={{ width: '100%' }}>
        <Button
          type="text"
          icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          onClick={togglePlay}
          size="large"
        />
        <Text type="secondary">{formatTime(progress)}</Text>
        <Slider
          min={0}
          max={duration || 100}
          value={progress}
          onChange={handleSliderChange}
          tooltip={{ formatter: (v) => formatTime(v) }}
          style={{ flex: 1, minWidth: 200 }}
        />
        <Text type="secondary">{formatTime(duration)}</Text>
        <SoundOutlined />
      </Space>
    </div>
  );
}
