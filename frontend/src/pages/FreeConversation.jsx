import { Typography, Button, Card, Space, message } from 'antd';
import { ArrowLeftOutlined, RobotOutlined, AudioOutlined, LoadingOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import useLearningTimeTracker from '../hooks/useLearningTimeTracker';

const { Title, Text } = Typography;

export default function FreeConversation() {
  useLearningTimeTracker('speaking', 'study_time:free-conversation');
  const navigate = useNavigate();

  const [status, setStatus] = useState('connecting'); // connecting | ready | listening
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentTranscript, setCurrentTranscript] = useState('');

  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const processorRef = useRef(null);
  const recordingContextRef = useRef(null);
  const playbackContextRef = useRef(null);
  const nextPlayTimeRef = useRef(0);       // schedule chunks sequentially
  const messagesEndRef = useRef(null);
  const aiTranscriptRef = useRef('');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages, currentTranscript]);

  // --- Audio playback (24kHz PCM from Gemini) ---
  // Schedule chunks sequentially so they don't overlap (like demo's output_stream.write)
  const playAudio = (base64Audio) => {
    try {
      const raw = atob(base64Audio);
      const pcm = new Int16Array(raw.length / 2);
      for (let i = 0; i < pcm.length; i++) {
        pcm[i] = (raw.charCodeAt(i * 2 + 1) << 8) | raw.charCodeAt(i * 2);
      }

      if (!playbackContextRef.current) {
        playbackContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = playbackContextRef.current;
      const sampleRate = 24000;
      const buf = ctx.createBuffer(1, pcm.length, sampleRate);
      const ch = buf.getChannelData(0);
      for (let i = 0; i < pcm.length; i++) {
        ch[i] = pcm[i] / (pcm[i] < 0 ? 0x8000 : 0x7FFF);
      }

      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);

      // Schedule this chunk right after the previous one ends
      const now = ctx.currentTime;
      const startTime = Math.max(now, nextPlayTimeRef.current);
      src.start(startTime);
      nextPlayTimeRef.current = startTime + buf.duration;
    } catch (err) {
      console.error('Playback error:', err);
    }
  };

  // --- Start continuous mic capture (like the demo) ---
  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000, echoCancellation: true, noiseSuppression: true }
      });
      streamRef.current = stream;

      if (!recordingContextRef.current) {
        recordingContextRef.current = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      }
      const ctx = recordingContextRef.current;
      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(512, 1, 1);

      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        const pcm = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        // Convert to base64 safely
        const bytes = new Uint8Array(pcm.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        if (socketRef.current) {
          socketRef.current.emit('audio_chunk', { audio: btoa(binary) });
        }
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      processorRef.current = processor;
      setStatus('listening');
    } catch (err) {
      console.error('Mic error:', err);
      message.error('Cannot access microphone. Please check permissions.');
    }
  };

  const stopMic = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  // --- WebSocket connection ---
  useEffect(() => {
    const socket = io('http://localhost:5000/conversation');
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connecting');
      socket.emit('start_conversation');
    });

    socket.on('disconnect', () => {
      setStatus('connecting');
    });

    // Gemini session is ready - start mic
    socket.on('ready', () => {
      setStatus('ready');
      startMic();
    });

    socket.on('ai_audio_chunk', (data) => {
      setAiSpeaking(true);
      if (data.audio) playAudio(data.audio);
    });

    socket.on('ai_transcript', (data) => {
      aiTranscriptRef.current = data.text;
    });

    socket.on('user_transcript', (data) => {
      setCurrentTranscript(data.text);
    });

    socket.on('user_final', (data) => {
      if (data.text) {
        setMessages(prev => [...prev, { role: 'user', text: data.text }]);
      }
      setCurrentTranscript('');
    });

    socket.on('ai_speaking_end', () => {
      if (aiTranscriptRef.current) {
        setMessages(prev => [...prev, { role: 'ai', text: aiTranscriptRef.current }]);
        aiTranscriptRef.current = '';
      }
      nextPlayTimeRef.current = 0;  // reset for next turn
      setAiSpeaking(false);
    });

    socket.on('error', (data) => {
      message.error(data.message || 'An error occurred');
    });

    return () => {
      socket.emit('end_conversation');
      socket.disconnect();
      stopMic();
    };
  }, []);

  const handleEndConversation = () => {
    navigate('/speaking');
  };

  const statusText = {
    connecting: '⏳ Connecting to AI...',
    ready: '🔄 Starting microphone...',
    listening: aiSpeaking ? '🔊 AI is speaking...' : '🎤 Listening... Just speak naturally',
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={handleEndConversation} />
          <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
            <RobotOutlined style={{ marginRight: 10, color: '#059669' }} />Free Conversation
          </Title>
        </div>
        <Text type="secondary">{statusText[status]}</Text>
      </div>

      {/* Conversation Area */}
      <Card style={{ marginTop: 24, borderRadius: 12, minHeight: 500, maxHeight: 600, overflow: 'auto' }}>
        <div style={{ padding: 16 }}>
          {messages.length === 0 && status === 'connecting' && (
            <div style={{ textAlign: 'center', padding: 48, color: '#999' }}>
              <LoadingOutlined style={{ fontSize: 32, marginBottom: 16 }} />
              <div>Connecting to AI conversation partner...</div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 16
            }}>
              <div style={{
                maxWidth: '70%',
                padding: '12px 16px',
                borderRadius: 12,
                background: msg.role === 'user' ? '#3b82f6' : '#f3f4f6',
                color: msg.role === 'user' ? 'white' : '#1a1a2e'
              }}>
                <Text style={{ color: msg.role === 'user' ? 'white' : '#1a1a2e' }}>
                  {msg.text}
                </Text>
              </div>
            </div>
          ))}

          {/* Real-time user transcript */}
          {currentTranscript && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <div style={{
                maxWidth: '70%', padding: '12px 16px', borderRadius: 12,
                background: '#dbeafe', color: '#1e40af', opacity: 0.7
              }}>
                <Text style={{ color: '#1e40af' }}>{currentTranscript}...</Text>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </Card>

      {/* Status & Controls */}
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Space direction="vertical" size="middle">
          {status === 'listening' && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 20px', borderRadius: 20,
              background: aiSpeaking ? '#fef3c7' : '#ecfdf5',
              color: aiSpeaking ? '#d97706' : '#059669'
            }}>
              <AudioOutlined />
              <span>{aiSpeaking ? 'AI is speaking...' : 'Mic is on — speak freely'}</span>
            </div>
          )}
          <Button danger onClick={handleEndConversation} size="large">
            End Conversation
          </Button>
        </Space>
      </div>
    </div>
  );
}
