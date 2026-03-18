import React, { useEffect, useRef, useState } from 'react';
import { Button, Slider, Space, Typography } from 'antd';
import { SoundOutlined, PauseCircleOutlined, PlayCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function AudioPlayer({ src, title }) {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setPlaying(false);
    setProgress(0);
    setDuration(0);

    if (src) {
      audio.load();
    }
  }, [src]);

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (!playing) {
      try {
        await audioRef.current.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
      return;
    }

    audioRef.current.pause();
    setPlaying(false);
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
    if (!Number.isFinite(seconds) || seconds < 0) {
      return '0:00';
    }
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
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      {title && <Text strong style={{ marginBottom: 8, display: 'block' }}>{title}</Text>}
      <Space style={{ width: '100%' }}>
        <Button
          type="text"
          icon={playing ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
          onClick={togglePlay}
          size="large"
          disabled={!src}
        />
        <Text type="secondary">{formatTime(progress)}</Text>
        <Slider
          min={0}
          max={duration || 100}
          value={progress}
          onChange={handleSliderChange}
          tooltip={{ formatter: (value) => formatTime(Number(value) || 0) }}
          style={{ flex: 1, minWidth: 200 }}
          disabled={!src}
        />
        <Text type="secondary">{formatTime(duration)}</Text>
        <SoundOutlined />
      </Space>
    </div>
  );
}
