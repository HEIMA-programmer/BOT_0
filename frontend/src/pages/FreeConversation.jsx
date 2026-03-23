import { Typography, Button, Card, Space, message } from 'antd';
import { AudioOutlined, ArrowLeftOutlined, StopOutlined, RobotOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import useLearningTimeTracker from '../hooks/useLearningTimeTracker';

const { Title, Text } = Typography;

export default function FreeConversation() {
  useLearningTimeTracker('speaking', 'study_time:free-conversation');
  const navigate = useNavigate();

  // State management
  const [connected, setConnected] = useState(false);
  const [recording, setRecording] = useState(false);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState('');

  // Refs
  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const audioContextRef = useRef(null);
  const messagesEndRef = useRef(null);
  const currentAudioChunksRef = useRef([]);
  const currentTranscriptRef = useRef('');

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Audio playback function
  const playAudio = async (base64Audio) => {
    try {
      // Decode base64 PCM audio
      const audioData = atob(base64Audio);
      const pcmData = new Int16Array(audioData.length / 2);
      for (let i = 0; i < pcmData.length; i++) {
        pcmData[i] = (audioData.charCodeAt(i * 2 + 1) << 8) | audioData.charCodeAt(i * 2);
      }

      // Create audio context if not exists
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }

      // Convert PCM Int16 to Float32 for Web Audio API
      const sampleRate = 24000; // Gemini outputs at 24kHz
      const audioBuffer = audioContextRef.current.createBuffer(1, pcmData.length, sampleRate);
      const channelData = audioBuffer.getChannelData(0);

      for (let i = 0; i < pcmData.length; i++) {
        channelData[i] = pcmData[i] / (pcmData[i] < 0 ? 0x8000 : 0x7FFF);
      }

      // Play audio
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => {
        setAiSpeaking(false);
      };
      source.start(0);
    } catch (err) {
      console.error('Error playing audio:', err);
      setAiSpeaking(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      streamRef.current = stream;

      // Create audio context for PCM capture
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
          sampleRate: 16000
        });
      }

      const source = audioContextRef.current.createMediaStreamSource(stream);
      const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        if (!recording) return;

        const inputData = e.inputBuffer.getChannelData(0);
        // Convert Float32Array to Int16Array (PCM)
        const pcmData = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          const s = Math.max(-1, Math.min(1, inputData[i]));
          pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Convert to base64 and send
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        socketRef.current.emit('audio_chunk', { audio: base64Audio });
      };

      source.connect(processor);
      processor.connect(audioContextRef.current.destination);

      mediaRecorderRef.current = processor; // Store processor for cleanup
      setRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      message.error('Cannot access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      // Disconnect audio processor
      mediaRecorderRef.current.disconnect();
      mediaRecorderRef.current = null;
      setRecording(false);

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }

      // Notify backend that user stopped speaking
      socketRef.current.emit('stop_speaking');
    }
  };

  const handleEndConversation = () => {
    if (window.confirm('Are you sure you want to end this conversation?')) {
      navigate('/speaking');
    }
  };

  // Auto scroll effect
  useEffect(() => {
    scrollToBottom();
  }, [messages, currentTranscript]);

  // WebSocket connection
  useEffect(() => {
    const socket = io('http://localhost:5000/conversation');
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to WebSocket');
      setConnected(true);
      socket.emit('start_conversation');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
      setConnected(false);
    });

    socket.on('ai_greeting', (data) => {
      setMessages([{
        role: 'ai',
        text: data.text,
        timestamp: new Date()
      }]);
      if (data.audio) {
        playAudio(data.audio);
      }
    });

    // 新增：处理流式音频块
    socket.on('ai_audio_chunk', (data) => {
      setAiSpeaking(true);
      if (data.audio) {
        currentAudioChunksRef.current.push(data.audio);
        playAudio(data.audio);
      }
    });

    // 新增：处理 AI 转写
    socket.on('ai_transcript', (data) => {
      currentTranscriptRef.current = data.text;
    });

    socket.on('user_transcript', (data) => {
      setCurrentTranscript(data.text);
    });

    socket.on('user_final', (data) => {
      setMessages(prev => [...prev, {
        role: 'user',
        text: data.text,
        timestamp: new Date()
      }]);
      setCurrentTranscript('');
    });

    socket.on('ai_response', (data) => {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: data.text,
        timestamp: new Date()
      }]);
      setAiSpeaking(true);
      if (data.audio) {
        playAudio(data.audio);
      }
    });

    socket.on('ai_speaking_end', () => {
      // 添加 AI 消息（使用累积的转写）
      if (currentTranscriptRef.current) {
        setMessages(prev => [...prev, {
          role: 'ai',
          text: currentTranscriptRef.current,
          timestamp: new Date()
        }]);
        currentTranscriptRef.current = '';
      }
      currentAudioChunksRef.current = [];
      setAiSpeaking(false);
    });

    socket.on('error', (data) => {
      message.error(data.message || 'An error occurred');
      setRecording(false);
      setAiSpeaking(false);
    });

    return () => {
      socket.emit('end_conversation');
      socket.disconnect();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleEndConversation}
          />
          <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
            <RobotOutlined style={{ marginRight: 10, color: '#059669' }} />Free Conversation
          </Title>
        </div>
        <Text type="secondary">
          {connected ? (
            aiSpeaking ? '🔊 AI is speaking...' : recording ? '🎤 Listening...' : '💬 Ready to chat'
          ) : '⏳ Connecting...'}
        </Text>
      </div>

      {/* Conversation Area */}
      <Card style={{ marginTop: 24, borderRadius: 12, minHeight: 500, maxHeight: 600, overflow: 'auto' }}>
        <div style={{ padding: 16 }}>
          {messages.map((msg, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: 16
              }}
            >
              <div
                style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: msg.role === 'user' ? '#3b82f6' : '#f3f4f6',
                  color: msg.role === 'user' ? 'white' : '#1a1a2e'
                }}
              >
                <Text style={{ color: msg.role === 'user' ? 'white' : '#1a1a2e' }}>
                  {msg.text}
                </Text>
              </div>
            </div>
          ))}

          {/* Current transcript (real-time) */}
          {currentTranscript && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <div
                style={{
                  maxWidth: '70%',
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: '#dbeafe',
                  color: '#1e40af',
                  opacity: 0.7
                }}
              >
                <Text style={{ color: '#1e40af' }}>{currentTranscript}...</Text>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </Card>

      {/* Control Area */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Button
              type="primary"
              shape="circle"
              size="large"
              icon={recording ? <StopOutlined /> : <AudioOutlined />}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
              disabled={!connected || aiSpeaking}
              style={{
                width: 80,
                height: 80,
                fontSize: 32,
                background: recording ? '#ef4444' : '#059669',
                borderColor: recording ? '#ef4444' : '#059669'
              }}
            />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">
                {recording ? 'Release to send' : 'Hold to speak'}
              </Text>
            </div>
          </div>

          <Button
            danger
            onClick={handleEndConversation}
            size="large"
          >
            End Conversation
          </Button>
        </Space>
      </div>
    </div>
  );
}
