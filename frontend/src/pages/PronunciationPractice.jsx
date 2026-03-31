import { Typography, Card, Row, Col, Button, Space, Breadcrumb, Divider, message, Spin } from 'antd';
import { AudioOutlined, PlayCircleOutlined, ArrowLeftOutlined, CheckCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import useLearningTimeTracker from '../hooks/useLearningTimeTracker';

const { Title, Text, Paragraph } = Typography;

export default function PronunciationPractice() {
  useLearningTimeTracker('speaking', 'study_time:pronunciation-practice');
  const navigate = useNavigate();

  const [selectedWord, setSelectedWord] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [progressMessage, setProgressMessage] = useState('');
  const [nativeAudioUrl, setNativeAudioUrl] = useState(null);
  const [userAudioUrl, setUserAudioUrl] = useState(null);

  const socketRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);
  const streamRef = useRef(null);
  const nativeAudioRef = useRef(null);
  const userAudioRef = useRef(null);

  const practiceWords = [
    { id: 1, word: 'pronunciation', phonetic: '/prəˌnʌnsiˈeɪʃn/', meaning: '发音' },
    { id: 2, word: 'vocabulary', phonetic: '/vəˈkæbjələri/', meaning: '词汇' },
    { id: 3, word: 'articulation', phonetic: '/ɑːˌtɪkjʊˈleɪʃn/', meaning: '清晰发音' },
    { id: 4, word: 'intonation', phonetic: '/ˌɪntəˈneɪʃn/', meaning: '语调' },
    { id: 5, word: 'rhythm', phonetic: '/ˈrɪðəm/', meaning: '节奏' },
    { id: 6, word: 'emphasis', phonetic: '/ˈemfəsɪs/', meaning: '强调' },
    { id: 7, word: 'enunciation', phonetic: '/ɪˌnʌnsiˈeɪʃn/', meaning: '清晰发音' },
    { id: 8, word: 'fluency', phonetic: '/ˈfluːənsi/', meaning: '流利' },
  ];

  useEffect(() => {
    const socket = io('http://localhost:5000');
    socketRef.current = socket;

    socket.on('connected', () => {
      console.log('Connected to WebSocket');
    });

    socket.on('progress', (data) => {
      setProcessing(true);
      setProgressMessage(data.message || '处理中...');
    });

    socket.on('result', (data) => {
      message.destroy();
      setProcessing(false);
      setProgressMessage('');
      setResult(data);
      message.success('Scoring complete! 🎉');
    });

    socket.on('error', (data) => {
      message.destroy();
      setProcessing(false);
      setProgressMessage('');
      setError(data.message);
      message.error(data.message || '处理失败，请重试');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleWordSelect = (word) => {
    setSelectedWord(word);
    setResult(null);
    setError(null);
    setNativeAudioUrl(null);
    setUserAudioUrl(null);
  };

  const playNativeAudio = () => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(selectedWord.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    } else {
      message.warning('您的浏览器不支持语音合成');
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

      let options = {};
      if (MediaRecorder.isTypeSupported('audio/wav')) {
        options = { mimeType: 'audio/wav' };
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
        console.warn('WAV not supported, using WebM as fallback');
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = handleRecordingStop;

      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => {
          if (prev >= 30) {
            stopRecording();
            return 30;
          }
          return prev + 1;
        });
      }, 1000);

    } catch (err) {
      console.error('Error accessing microphone:', err);
      message.error('无法访问麦克风，请检查权限设置');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  };

  const handleRecordingStop = async () => {
    const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
    const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
    const audioUrl = URL.createObjectURL(audioBlob);
    setUserAudioUrl(audioUrl);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Audio = reader.result.split(',')[1];

      if (socketRef.current) {
        socketRef.current.emit('submit_audio', {
          audio: base64Audio,
          topic: selectedWord.word,
          mimeType: mimeType
        });
      }
    };
    reader.readAsDataURL(audioBlob);
  };

  const handleReset = () => {
    setSelectedWord(null);
    setRecording(false);
    setRecordingTime(0);
    setProcessing(false);
    setResult(null);
    setError(null);
    setNativeAudioUrl(null);
    setUserAudioUrl(null);

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
  };

  const handleRetry = () => {
    setResult(null);
    setError(null);
    setRecordingTime(0);
    setUserAudioUrl(null);
  };

  if (!selectedWord) {
    return (
      <div className="page-container">
        <div style={{ marginBottom: 24 }}>
          <Breadcrumb
            items={[
              { title: <span onClick={() => navigate('/speaking')} style={{ cursor: 'pointer' }}>Speaking</span> },
              { title: 'Pronunciation Practice' }
            ]}
          />
        </div>

        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/speaking')}
            />
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
              <AudioOutlined style={{ marginRight: 10, color: '#dc2626' }} />Pronunciation Practice
            </Title>
          </div>
          <Text type="secondary">
            Listen to native pronunciation, record your voice, and compare
          </Text>
        </div>

        <Divider>
          <Text strong>Practice Words</Text>
        </Divider>

        <Row gutter={[16, 16]}>
          {practiceWords.map((word) => (
            <Col xs={24} sm={12} md={6} key={word.id}>
              <Card
                style={{
                  borderRadius: 12,
                  border: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                bodyStyle={{ padding: 20 }}
                onClick={() => handleWordSelect(word)}
                hoverable
              >
                <Title level={4} style={{ fontWeight: 600, marginBottom: 8 }}>{word.word}</Title>
                <Text type="secondary" style={{ fontSize: 14, display: 'block', marginBottom: 8 }}>
                  {word.phonetic}
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {word.meaning}
                </Text>
              </Card>
            </Col>
          ))}
        </Row>
      </div>
    );
  }

  if (result) {
    return (
      <div className="page-container">
        <div style={{ marginBottom: 24 }}>
          <Breadcrumb
            items={[
              { title: <span onClick={() => navigate('/speaking')} style={{ cursor: 'pointer' }}>Speaking</span> },
              { title: <span onClick={handleReset} style={{ cursor: 'pointer' }}>Pronunciation Practice</span> },
              { title: 'Results' }
            ]}
          />
        </div>

        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={handleReset}
            />
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
              <CheckCircleOutlined style={{ marginRight: 10, color: '#059669' }} />Pronunciation Results
            </Title>
          </div>
          <Text type="secondary">
            Word: {selectedWord.word}
          </Text>
        </div>

        <div style={{ marginTop: 32 }}>
          <Card style={{ marginBottom: 32, borderRadius: 12, textAlign: 'center' }}>
            <Title level={3} style={{ marginBottom: 24 }}>Overall Score</Title>
            <Progress
              type="circle"
              percent={result.pronunciation.overall}
              size={200}
              strokeColor="#dc2626"
              format={(percent) => (
                <div>
                  <div style={{ fontSize: 48, fontWeight: 700 }}>{percent}</div>
                  <div style={{ fontSize: 16, color: '#666' }}>Score</div>
                </div>
              )}
            />
          </Card>

          <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
            <Col xs={24} md={8}>
              <Card style={{ borderRadius: 12, textAlign: 'center' }}>
                <Title level={4} style={{ marginBottom: 16 }}>Accuracy</Title>
                <Progress
                  type="circle"
                  percent={result.pronunciation.accuracy}
                  size={120}
                  strokeColor="#3b82f6"
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card style={{ borderRadius: 12, textAlign: 'center' }}>
                <Title level={4} style={{ marginBottom: 16 }}>Fluency</Title>
                <Progress
                  type="circle"
                  percent={result.pronunciation.fluency}
                  size={120}
                  strokeColor="#7c3aed"
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card style={{ borderRadius: 12, textAlign: 'center' }}>
                <Title level={4} style={{ marginBottom: 16 }}>Prosody</Title>
                <Progress
                  type="circle"
                  percent={result.pronunciation.prosody}
                  size={120}
                  strokeColor="#059669"
                />
              </Card>
            </Col>
          </Row>

          <Card style={{ marginBottom: 32, borderRadius: 12 }}>
            <Title level={4} style={{ marginBottom: 16 }}>Your Pronunciation</Title>
            <Paragraph style={{ fontSize: 16, lineHeight: 1.8 }}>
              {result.transcript}
            </Paragraph>
          </Card>

          <div style={{ display: 'flex', gap: 16 }}>
            <Button size="large" onClick={handleRetry}>
              Try Again
            </Button>
            <Button type="primary" size="large" onClick={handleReset}>
              Choose Another Word
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <Breadcrumb
          items={[
            { title: <span onClick={() => navigate('/speaking')} style={{ cursor: 'pointer' }}>Speaking</span> },
            { title: <span onClick={handleReset} style={{ cursor: 'pointer' }}>Pronunciation Practice</span> },
            { title: selectedWord.word }
          ]}
        />
      </div>

      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={handleReset}
            disabled={recording || processing}
          />
          <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
            {selectedWord.word}
          </Title>
        </div>
        <Text type="secondary">
          {selectedWord.phonetic} - {selectedWord.meaning}
        </Text>
      </div>

      {processing ? (
        <div style={{
          background: '#f8fafc',
          borderRadius: 16,
          padding: 48,
          textAlign: 'center',
          marginTop: 24,
        }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 64, color: '#dc2626' }} spin />} />
          <Title level={3} style={{ marginTop: 32, color: '#dc2626' }}>
            {progressMessage || 'Processing...'}
          </Title>
          <Text type="secondary" style={{ fontSize: 16 }}>
            Please wait, AI is analyzing your pronunciation...
          </Text>
        </div>
      ) : (
        <div style={{ marginTop: 32 }}>
          <Card style={{ marginBottom: 24, borderRadius: 12 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Title level={3} style={{ marginBottom: 16 }}>Step 1: Listen to Native Pronunciation</Title>
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={playNativeAudio}
                style={{ background: '#3b82f6' }}
              >
                Play Native Audio
              </Button>
            </div>
          </Card>

          <Card style={{ borderRadius: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <Title level={3} style={{ marginBottom: 24 }}>Step 2: Record Your Pronunciation</Title>
              
              <div style={{
                width: 160,
                height: 160,
                borderRadius: '50%',
                background: recording ? '#fee2e2' : '#fef2f2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 32px',
                border: `6px solid ${recording ? '#dc2626' : '#dc2626'}`,
              }}>
                <Button
                  type="primary"
                  shape="circle"
                  size="large"
                  onClick={recording ? stopRecording : startRecording}
                  style={{
                    width: 100,
                    height: 100,
                    background: recording ? '#dc2626' : '#dc2626',
                    border: 'none',
                  }}
                >
                  {recording ? (
                    <PauseCircleOutlined style={{ fontSize: 56 }} />
                  ) : (
                    <AudioOutlined style={{ fontSize: 56 }} />
                  )}
                </Button>
              </div>

              <div style={{ marginBottom: 32 }}>
                <Text style={{ fontSize: 24, fontWeight: 600 }}>
                  {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                </Text>
                <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                  {recording ? 'Recording...' : recordingTime > 0 ? 'Recording completed' : 'Click to start recording'}
                </Text>
              </div>

              {error && (
                <div style={{ marginBottom: 24 }}>
                  <Text type="danger">{error}</Text>
                  <div style={{ marginTop: 16 }}>
                    <Button onClick={handleRetry}>Retry</Button>
                  </div>
                </div>
              )}

              {userAudioUrl && (
                <div style={{ marginTop: 24 }}>
                  <Text strong>Your Recording:</Text>
                  <audio 
                    ref={userAudioRef}
                    src={userAudioUrl} 
                    controls 
                    style={{ width: '100%', marginTop: 12 }}
                  />
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
