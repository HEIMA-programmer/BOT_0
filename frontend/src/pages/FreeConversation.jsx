import { Typography, Button, Card, Space } from 'antd';
import { ArrowLeftOutlined, RobotOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useLearningTimeTracker from '../hooks/useLearningTimeTracker';
import useConversation from '../hooks/useConversation';
import ConversationView from '../components/ConversationView';
import VoiceSelector from '../components/VoiceSelector';
import ScoringResultsModal from '../components/ScoringResultsModal';
import { chatHistoryAPI } from '../api';

const { Title, Text } = Typography;

export default function FreeConversation() {
  useLearningTimeTracker('speaking', 'study_time:free-conversation');
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state || {};

  const [phase, setPhase] = useState('setup'); // setup | conversation | results
  const [voiceName, setVoiceName] = useState(
    localStorage.getItem('preferred_voice') || 'Puck'
  );
  const [showScoring, setShowScoring] = useState(false);

  const conversation = useConversation();

  const handleStart = useCallback(async () => {
    setPhase('conversation');
    try {
      // Create DB session
      const res = await chatHistoryAPI.createSession({
        scenario_type: 'free_conversation',
      });
      const dbSessionId = res.data.id;

      conversation.connect({
        voiceName,
        dbSessionId,
        scenarioType: 'free_conversation',
      });
    } catch (err) {
      console.error('Failed to create session:', err);
      // Still connect even if DB session creation fails
      conversation.connect({ voiceName, scenarioType: 'free_conversation' });
    }
  }, [voiceName, conversation]);

  const handleEnd = useCallback(() => {
    conversation.endConversation();
    // Auto-request scoring if there are messages
    if (conversation.messages.length > 0) {
      conversation.requestScoring();
      setShowScoring(true);
    }
  }, [conversation]);

  const handleBack = () => {
    if (conversation.status === 'listening') {
      conversation.endConversation();
    }
    navigate('/speaking', { state: { tab: 'ai-chat' } });
  };

  // Setup phase
  if (phase === 'setup') {
    return (
      <div className="page-container">
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/speaking', { state: { tab: 'ai-chat' } })} />
            <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
              <RobotOutlined style={{ marginRight: 10, color: '#059669' }} />
              Free Conversation
            </Title>
          </div>
          <Text type="secondary">
            Practice natural English conversation with AI. Talk about any topic you like.
          </Text>
        </div>

        <Card style={{ marginTop: 24, borderRadius: 16, border: '1px solid #e5e7eb' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <VoiceSelector value={voiceName} onChange={setVoiceName} />

            <div style={{ textAlign: 'center', paddingTop: 16 }}>
              <Button
                type="primary"
                size="large"
                icon={<PlayCircleOutlined />}
                onClick={handleStart}
                style={{
                  height: 48,
                  padding: '0 40px',
                  borderRadius: 24,
                  fontSize: 16,
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none',
                }}
              >
                Start Conversation
              </Button>
              <div style={{ marginTop: 12, color: '#9ca3af', fontSize: 13 }}>
                AI will greet you first. Just speak naturally!
              </div>
            </div>
          </Space>
        </Card>
      </div>
    );
  }

  // Conversation phase
  return (
    <div className="page-container">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={handleBack} />
          <Title level={2} style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}>
            <RobotOutlined style={{ marginRight: 10, color: '#059669' }} />
            Free Conversation
          </Title>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <ConversationView
          status={conversation.status}
          aiSpeaking={conversation.aiSpeaking}
          messages={conversation.messages}
          currentTranscript={conversation.currentTranscript}
          currentAiTranscript={conversation.currentAiTranscript}
          onEndConversation={handleEnd}
        />
      </div>

      {/* Show scoring button after conversation ends if not auto-triggered */}
      {conversation.status === 'ended' && conversation.messages.length > 0 && !showScoring && (
        <div style={{ textAlign: 'center', marginTop: 24 }}>
          <Space>
            <Button
              type="primary"
              onClick={() => {
                conversation.requestScoring();
                setShowScoring(true);
              }}
            >
              Get AI Feedback
            </Button>
            <Button onClick={() => navigate('/speaking', { state: { tab: 'ai-chat' } })}>
              Back to Speaking Studio
            </Button>
          </Space>
        </div>
      )}

      <ScoringResultsModal
        open={showScoring}
        onClose={() => {
          setShowScoring(false);
          if (conversation.scoringStatus === 'done') {
            if (state.taskId) {
              window.dispatchEvent(new CustomEvent('taskCompleted', { detail: { taskId: state.taskId } }));
            }
            navigate('/speaking', { state: { tab: 'ai-chat' } });
          }
        }}
        scores={conversation.scores}
        scoringStatus={conversation.scoringStatus}
      />
    </div>
  );
}
