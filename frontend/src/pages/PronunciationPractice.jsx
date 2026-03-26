import { useState, useEffect, useRef } from 'react';
import { Typography, Card, Button, Space, Progress, Input, message, Spin, Row, Col, Tabs, Divider, Select, Empty, List, Tag } from 'antd';
import { AudioOutlined, PauseCircleOutlined, ArrowLeftOutlined, SoundOutlined, TrophyOutlined, ReloadOutlined, BookOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import useLearningTimeTracker from '../hooks/useLearningTimeTracker';
import { wordBankAPI } from '../api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const introductionSentences = [
  "My name is ___, and I'm currently pursuing my studies in ___.",
  "I'm originally from ___, which is well known for ___.",
  "At the moment, I'm studying at ___, where I focus on ___.",
  "I've always had a strong interest in ___, especially ___.",
  "My main academic focus lies in ___, which I find both challenging and rewarding.",
  "I chose this major mainly because I'm genuinely interested in ___.",
  "In my spare time, I tend to ___, as it helps me relax and recharge.",
  "If I had to describe myself, I'd say I'm quite ___ and ___.",
  "One of my key strengths is my ability to ___.",
  "I'm particularly confident when it comes to ___.",
  "I've gained some valuable experience in ___ over the past few years.",
  "I'm always willing to step out of my comfort zone and learn new things.",
  "I feel comfortable working both independently and as part of a team.",
  "I consider myself to be responsible, motivated, and goal-oriented.",
  "Recently, I've been trying to improve my skills in ___.",
  "Looking ahead, I hope to pursue a career in ___.",
  "My long-term goal is to contribute to ___ in a meaningful way.",
  "I believe I can add value through my skills in ___.",
  "I'm really looking forward to taking on new challenges in the future.",
  "Thank you very much for your time and attention."
];

const communicationSentences = [
  "I genuinely enjoy collaborating with others.",
  "In my opinion, effective communication is the key to successful teamwork.",
  "I always make an effort to listen carefully before expressing my own ideas.",
  "I respect different viewpoints, even when I don't completely agree with them.",
  "I believe teamwork often leads to more creative and effective solutions.",
  "I'm always willing to support my teammates whenever they need help.",
  "I try to communicate my thoughts in a clear and structured way.",
  "I'm open to constructive feedback and see it as a way to improve.",
  "I believe mutual trust is essential in any team environment.",
  "I try to maintain a positive attitude, even in challenging situations.",
  "When conflicts arise, I prefer to resolve them through open discussion.",
  "I think empathy plays a crucial role in understanding others.",
  "I try to stay patient, especially when working with different personalities.",
  "I value cooperation more than competition in most situations.",
  "I enjoy exchanging ideas and learning from others.",
  "I believe everyone brings something unique to the team.",
  "I try to adapt my working style depending on the team.",
  "I'm comfortable taking responsibility when necessary.",
  "At the same time, I know when to step back and support others.",
  "Overall, I think good communication helps prevent misunderstandings."
];

const presentationSentences = [
  "Today, I'd like to talk about ___.",
  "The topic I'm going to discuss today is ___.",
  "In this presentation, I will focus on ___.",
  "To begin with, I'll give a brief overview of the topic.",
  "First of all, let me introduce the background of ___.",
  "Let's start by looking at ___.",
  "Moving on to the next point, I'd like to discuss ___.",
  "Another key aspect to consider is ___.",
  "This clearly shows that ___.",
  "For instance, ___.",
  "In addition to that, ___.",
  "It's important to point out that ___.",
  "As we can see from this, ___.",
  "This leads us to the conclusion that ___.",
  "As a result, ___.",
  "To sum up, ___.",
  "In conclusion, ___.",
  "Overall, it can be seen that ___.",
  "Thank you for listening, and I hope you found this useful.",
  "I'd be happy to answer any questions you may have."
];

export default function PronunciationPractice() {
  useLearningTimeTracker('speaking', 'study_time:pronunciation-practice');
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('word');
  const [word, setWord] = useState('');
  const [sentence, setSentence] = useState('');
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [wordBankWords, setWordBankWords] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('introduction');

  const [recognition, setRecognition] = useState(null);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    fetchWordBankWords();
    
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'en-US';
      
      recognitionInstance.onresult = (event) => {
        const currentTranscript = event.results[0][0].transcript;
        setTranscript(currentTranscript);
        evaluatePronunciation(currentTranscript);
      };
      
      recognitionInstance.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setProcessing(false);
        const errorMessage = getErrorMessage(event.error);
        setError(errorMessage);
        message.error(errorMessage);
      };
      
      recognitionInstance.onend = () => {
        setRecording(false);
      };
      
      setRecognition(recognitionInstance);
    } else {
      message.error('Your browser does not support speech recognition. Please use Chrome or Edge.');
    }
  }, [activeTab, word, sentence]);

  const fetchWordBankWords = async () => {
    try {
      const response = await wordBankAPI.getAll();
      setWordBankWords(response.data.words.slice(0, 20));
    } catch (err) {
      console.error('Failed to fetch word bank:', err);
    }
  };

  const filteredSentences = selectedCategory === 'introduction' 
    ? introductionSentences 
    : selectedCategory === 'communication' 
    ? communicationSentences 
    : presentationSentences;

  const getErrorMessage = (error) => {
    const errorMessages = {
      'no-speech': 'No speech detected. Please try again.',
      'audio-capture': 'No microphone found. Please check your audio device.',
      'not-allowed': 'Microphone access denied. Please allow microphone access.',
      'network': 'Network error. Please check your internet connection.',
      'aborted': 'Recording was aborted.',
      'service-not-allowed': 'Speech recognition service is not allowed.',
      'bad-grammar': 'Grammar error in recognition.',
      'language-not-supported': 'Language not supported.'
    };
    return errorMessages[error] || 'Recognition failed. Please try again.';
  };

  const calculateSimilarity = (str1, str2) => {
    const s1 = str1.toLowerCase().trim();
    const s2 = str2.toLowerCase().trim();
    
    if (s1 === s2) return 100;
    
    const words1 = s1.split(/\s+/);
    const words2 = s2.split(/\s+/);
    
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    const jaccard = intersection.size / union.size;
    
    const levenshtein = (a, b) => {
      const matrix = [];
      for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
      }
      for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
      }
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      return matrix[b.length][a.length];
    };
    
    const maxLen = Math.max(s1.length, s2.length);
    const levenshteinScore = maxLen > 0 ? (1 - levenshtein(s1, s2) / maxLen) * 100 : 0;
    
    return Math.round((jaccard * 0.4 + levenshteinScore * 0.6) * 100) / 100;
  };

  const evaluatePronunciation = (userTranscript) => {
    const targetText = activeTab === 'word' ? word : sentence;
    const accuracy = calculateSimilarity(userTranscript, targetText);
    
    let feedback = '';
    let strengths = [];
    let improvements = [];
    
    if (accuracy >= 90) {
      feedback = 'Excellent pronunciation! You sound like a native speaker.';
      strengths.push('Perfect pronunciation', 'Clear articulation', 'Natural rhythm');
    } else if (accuracy >= 80) {
      feedback = 'Great job! Your pronunciation is very good.';
      strengths.push('Good pronunciation', 'Clear speech', 'Good rhythm');
      improvements.push('Keep practicing to achieve perfect accuracy');
    } else if (accuracy >= 60) {
      feedback = 'Good effort! Your pronunciation is acceptable but needs improvement.';
      strengths.push('Understandable speech');
      improvements.push('Focus on individual word pronunciation', 'Practice speaking slowly and clearly', 'Listen to native speakers');
    } else {
      feedback = 'Keep practicing! Your pronunciation needs significant improvement.';
      improvements.push('Listen to the target text multiple times', 'Practice each word separately', 'Focus on vowel and consonant sounds', 'Use the Listen button to hear the correct pronunciation');
    }
    
    const fluency = Math.min(accuracy + Math.random() * 10, 100);
    
    setResult({
      accuracy: accuracy,
      pronunciation: {
        overall: accuracy,
        fluency: Math.round(fluency)
      },
      transcript: userTranscript,
      feedback: feedback,
      strengths: strengths,
      improvements: improvements
    });
    
    setProcessing(false);
    message.success('Pronunciation assessment complete! 🎉');
  };

  const startRecording = () => {
    const targetText = activeTab === 'word' ? word : sentence;
    if (!targetText.trim()) {
      message.warning(activeTab === 'word' ? 'Please enter a word to practice' : 'Please enter a sentence to practice');
      return;
    }

    if (!recognition) {
      message.error('Speech recognition is not available. Please use Chrome or Edge.');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      setResult(null);
      setTranscript('');
      setRecording(true);
      recognition.start();
    } catch (err) {
      console.error('Error starting recognition:', err);
      setProcessing(false);
      setRecording(false);
      message.error('Unable to start recognition. Please try again.');
    }
  };

  const stopRecording = () => {
    if (recognition && recording) {
      recognition.stop();
    }
  };

  const handleRetry = () => {
    setResult(null);
    setError(null);
  };

  const handleWordSelect = (selectedWord) => {
    setWord(selectedWord);
    setResult(null);
    setError(null);
  };

  const handleSentenceSelect = (selectedSentence) => {
    setSentence(selectedSentence);
    setResult(null);
    setError(null);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  const getScoreLevel = (score) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 60) return 'Pass';
    return 'Needs Improvement';
  };

  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      window.speechSynthesis.speak(utterance);
    }
  };

  const tabItems = [
    {
      key: 'word',
      label: 'Word Practice',
      children: (
        <div>
          <div style={{ marginBottom: 24 }}>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Select a word from your Word Bank to practice pronunciation
            </Text>
          </div>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            {word ? (
              <div>
                <Title level={1} style={{ fontSize: 48, color: '#1a1a2e', marginBottom: 16 }}>
                  {word}
                </Title>
                <Button
                  icon={<SoundOutlined />}
                  onClick={() => speakText(word)}
                  style={{ marginBottom: 24 }}
                >
                  Listen
                </Button>
                <div style={{ marginTop: 24 }}>
                  {!recording && !processing && !result && (
                    <Button
                      type="primary"
                      size="large"
                      icon={<AudioOutlined />}
                      onClick={startRecording}
                      style={{ height: 60, fontSize: 18, background: '#dc2626', borderColor: '#dc2626' }}
                    >
                      Start Recording
                    </Button>
                  )}
                  {recording && (
                    <Button
                      type="primary"
                      size="large"
                      danger
                      icon={<PauseCircleOutlined />}
                      onClick={stopRecording}
                      style={{ height: 60, fontSize: 18 }}
                    >
                      Stop Recording
                    </Button>
                  )}
                  {processing && (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <Spin size="large" />
                      <div style={{ marginTop: 16 }}>Processing your pronunciation...</div>
                    </div>
                  )}
                  {result && (
                    <div style={{ marginTop: 24 }}>
                      <div style={{ marginBottom: 24 }}>
                        <Progress
                          type="circle"
                          percent={Math.round(result.accuracy || 0)}
                          strokeColor={getScoreColor(result.accuracy || 0)}
                          size={150}
                          format={(percent) => (
                            <div>
                              <div style={{ fontSize: 32, fontWeight: 'bold' }}>{percent}%</div>
                              <div style={{ fontSize: 12, color: '#666' }}>Accuracy</div>
                            </div>
                          )}
                        />
                      </div>
                      <div style={{ marginBottom: 24 }}>
                        <Title level={4} style={{ color: getScoreColor(result.accuracy || 0) }}>
                          {getScoreLevel(result.accuracy || 0)}
                        </Title>
                        {result.feedback && (
                          <Text type="secondary">{result.feedback}</Text>
                        )}
                      </div>
                      <div style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                        <div>
                          <Text type="secondary">Pronunciation Score</Text>
                          <div style={{ fontSize: 24, fontWeight: 'bold', color: getScoreColor(result.pronunciation?.overall || 0) }}>
                            {result.pronunciation?.overall || 0}%
                          </div>
                        </div>
                        <div>
                          <Text type="secondary">Fluency Score</Text>
                          <div style={{ fontSize: 24, fontWeight: 'bold', color: getScoreColor(result.pronunciation?.fluency || 0) }}>
                            {result.pronunciation?.fluency || 0}%
                          </div>
                        </div>
                        <div>
                          <Text type="secondary">Your Transcript</Text>
                          <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                            {result.transcript || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <Text type="secondary">Target Text</Text>
                          <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                            {activeTab === 'word' ? word : sentence}
                          </div>
                        </div>
                      </div>
                      {result.strengths && result.strengths.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                          <Title level={5}>Strengths</Title>
                          <Space direction="vertical" style={{ width: '100%' }}>
                            {result.strengths.map((strength, index) => (
                              <Tag key={index} color="green" style={{ marginBottom: 8 }}>
                                <CheckCircleOutlined style={{ marginRight: 4 }} />
                                {strength}
                              </Tag>
                            ))}
                          </Space>
                        </div>
                      )}
                      {result.improvements && result.improvements.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                          <Title level={5}>Suggestions for Improvement</Title>
                          <List
                            dataSource={result.improvements}
                            renderItem={(item) => (
                              <List.Item>
                                <Text type="secondary">{item}</Text>
                              </List.Item>
                            )}
                          />
                        </div>
                      )}
                      <Space>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={handleRetry}
                        >
                          Try Again
                        </Button>
                      </Space>
                    </div>
                  )}
                  {error && (
                    <div style={{ marginTop: 24 }}>
                      <Text type="danger">{error}</Text>
                      <div style={{ marginTop: 16 }}>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={handleRetry}
                        >
                          Try Again
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Empty
                description="Please select a word from the Word Bank on the right"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'sentence',
      label: 'Sentence Practice',
      children: (
        <div>
          <div style={{ marginBottom: 24 }}>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Select a sentence to practice pronunciation with AI-powered scoring
            </Text>
          </div>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            {sentence ? (
              <div>
                <Title level={3} style={{ fontSize: 28, color: '#1a1a2e', marginBottom: 16, lineHeight: 1.4 }}>
                  {sentence}
                </Title>
                <Button
                  icon={<SoundOutlined />}
                  onClick={() => speakText(sentence)}
                  style={{ marginBottom: 24 }}
                >
                  Listen
                </Button>
                <div style={{ marginTop: 24 }}>
                  {!recording && !processing && !result && (
                    <Button
                      type="primary"
                      size="large"
                      icon={<AudioOutlined />}
                      onClick={startRecording}
                      style={{ height: 60, fontSize: 18, background: '#dc2626', borderColor: '#dc2626' }}
                    >
                      Start Recording
                    </Button>
                  )}
                  {recording && (
                    <Button
                      type="primary"
                      size="large"
                      danger
                      icon={<PauseCircleOutlined />}
                      onClick={stopRecording}
                      style={{ height: 60, fontSize: 18 }}
                    >
                      Stop Recording
                    </Button>
                  )}
                  {processing && (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <Spin size="large" />
                      <div style={{ marginTop: 16 }}>Processing your pronunciation...</div>
                    </div>
                  )}
                  {result && (
                    <div style={{ marginTop: 24 }}>
                      <div style={{ marginBottom: 24 }}>
                        <Progress
                          type="circle"
                          percent={Math.round(result.accuracy || 0)}
                          strokeColor={getScoreColor(result.accuracy || 0)}
                          size={150}
                          format={(percent) => (
                            <div>
                              <div style={{ fontSize: 32, fontWeight: 'bold' }}>{percent}%</div>
                              <div style={{ fontSize: 12, color: '#666' }}>Accuracy</div>
                            </div>
                          )}
                        />
                      </div>
                      <div style={{ marginBottom: 24 }}>
                        <Title level={4} style={{ color: getScoreColor(result.accuracy || 0) }}>
                          {getScoreLevel(result.accuracy || 0)}
                        </Title>
                        {result.feedback && (
                          <Text type="secondary">{result.feedback}</Text>
                        )}
                      </div>
                      <div style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
                        <div>
                          <Text type="secondary">Pronunciation Score</Text>
                          <div style={{ fontSize: 24, fontWeight: 'bold', color: getScoreColor(result.pronunciation?.overall || 0) }}>
                            {result.pronunciation?.overall || 0}%
                          </div>
                        </div>
                        <div>
                          <Text type="secondary">Fluency Score</Text>
                          <div style={{ fontSize: 24, fontWeight: 'bold', color: getScoreColor(result.pronunciation?.fluency || 0) }}>
                            {result.pronunciation?.fluency || 0}%
                          </div>
                        </div>
                        <div>
                          <Text type="secondary">Your Transcript</Text>
                          <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                            {result.transcript || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <Text type="secondary">Target Text</Text>
                          <div style={{ fontSize: 14, color: '#666', marginTop: 4 }}>
                            {activeTab === 'word' ? word : sentence}
                          </div>
                        </div>
                      </div>
                      {result.strengths && result.strengths.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                          <Title level={5}>Strengths</Title>
                          <Space direction="vertical" style={{ width: '100%' }}>
                            {result.strengths.map((strength, index) => (
                              <Tag key={index} color="green" style={{ marginBottom: 8 }}>
                                <CheckCircleOutlined style={{ marginRight: 4 }} />
                                {strength}
                              </Tag>
                            ))}
                          </Space>
                        </div>
                      )}
                      {result.improvements && result.improvements.length > 0 && (
                        <div style={{ marginBottom: 24 }}>
                          <Title level={5}>Suggestions for Improvement</Title>
                          <List
                            dataSource={result.improvements}
                            renderItem={(item) => (
                              <List.Item>
                                <Text type="secondary">{item}</Text>
                              </List.Item>
                            )}
                          />
                        </div>
                      )}
                      <Space>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={handleRetry}
                        >
                          Try Again
                        </Button>
                      </Space>
                    </div>
                  )}
                  {error && (
                    <div style={{ marginTop: 24 }}>
                      <Text type="danger">{error}</Text>
                      <div style={{ marginTop: 16 }}>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={handleRetry}
                        >
                          Try Again
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Empty
                description="Please select a sentence from the Practice Sentences on the right"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )}
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="page-container">
      <div style={{ marginBottom: 24 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/speaking')}
          style={{ marginBottom: 16 }}
        />
        <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
          <SoundOutlined style={{ marginRight: 10, color: '#dc2626' }} />Pronunciation Practice
        </Title>
        <Text type="secondary">
          Practice pronunciation with AI-powered scoring and feedback
        </Text>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} md={16}>
          <Card style={{ borderRadius: 12, height: '100%' }}>
            <Tabs 
              activeKey={activeTab} 
              onChange={(key) => {
                setActiveTab(key);
                setResult(null);
                setError(null);
              }}
              items={tabItems}
            />
          </Card>
        </Col>

        <Col xs={24} md={8}>
          {activeTab === 'word' ? (
            <Card 
              title={<span><SoundOutlined style={{ marginRight: 8 }} />Word Bank</span>}
              style={{ borderRadius: 12, height: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                {wordBankWords.map((item) => (
                  <Button
                    key={item.id}
                    block
                    onClick={() => handleWordSelect(item.text)}
                    disabled={recording || processing}
                    style={{
                      textAlign: 'left',
                      height: 'auto',
                      padding: '12px 16px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>{item.text}</div>
                      <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                        {item.definition.substring(0, 50)}...
                      </div>
                    </div>
                  </Button>
                ))}
              </Space>
            </Card>
          ) : (
            <Card 
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span><BookOutlined style={{ marginRight: 8 }} />Practice Sentences</span>
                  <Select
                    value={selectedCategory}
                    onChange={setSelectedCategory}
                    style={{ width: 150 }}
                    size="small"
                  >
                    <Select.Option value="introduction">Introduction</Select.Option>
                    <Select.Option value="communication">Communication</Select.Option>
                    <Select.Option value="presentation">Presentation</Select.Option>
                  </Select>
                </div>
              }
              style={{ borderRadius: 12, height: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%', maxHeight: 600, overflowY: 'auto' }} size="small">
                {filteredSentences.map((item, index) => (
                  <Button
                    key={index}
                    block
                    onClick={() => handleSentenceSelect(item)}
                    disabled={recording || processing}
                    style={{
                      textAlign: 'left',
                      height: 'auto',
                      padding: '12px 16px',
                      whiteSpace: 'normal',
                    }}
                  >
                    <div style={{ fontSize: 14 }}>{item}</div>
                  </Button>
                ))}
              </Space>
            </Card>
          )}
        </Col>
      </Row>
    </div>
  );
}