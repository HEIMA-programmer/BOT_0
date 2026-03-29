/**
 * Shared conversation chat UI component.
 * Used by Free Conversation and Guided Conversation pages.
 */
import { useEffect, useRef } from 'react';
import { Button } from 'antd';
import { RobotOutlined, UserOutlined, AudioOutlined, SoundOutlined } from '@ant-design/icons';
import './ConversationView.css';

function formatTime(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function WaveformBars({ color = '#10b981' }) {
  return (
    <div className="waveform">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="waveform-bar" style={{ background: color }} />
      ))}
    </div>
  );
}

export default function ConversationView({
  status,
  aiSpeaking,
  messages,
  currentTranscript,
  currentAiTranscript,
  onEndConversation,
  readOnly = false,
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentTranscript, currentAiTranscript]);

  // Loading / connecting state
  if (status === 'connecting' || status === 'ready') {
    return (
      <div className="conversation-container">
        <div className="conversation-loading">
          <div className="typing-dots">
            <span /><span /><span />
          </div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>
            {status === 'connecting' ? 'Connecting to AI...' : 'Starting microphone...'}
          </div>
          <div style={{ fontSize: 13, color: '#9ca3af' }}>
            This may take a few seconds
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="conversation-container">
      {/* Messages area */}
      <div className="conversation-messages">
        {messages.length === 0 && !currentAiTranscript && !currentTranscript && status === 'listening' && (
          <div className="conversation-empty">
            <RobotOutlined />
            <div>Waiting for conversation to begin...</div>
            <div style={{ fontSize: 12 }}>Speak naturally or wait for AI to start</div>
          </div>
        )}

        {messages.map((msg, index) => (
          <div key={index} className={`message-row ${msg.role === 'user' ? 'user' : 'ai'}`}>
            <div className={`message-avatar ${msg.role === 'user' ? 'user' : 'ai'}`}>
              {msg.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
            </div>
            <div className="message-content">
              <div className={`message-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
                {msg.text || msg.content}
              </div>
              <div className="message-time">
                {formatTime(msg.timestamp || msg.created_at)}
              </div>
            </div>
          </div>
        ))}

        {/* User live transcript (show before AI streaming so order is correct) */}
        {currentTranscript && (
          <div className="transcript-row">
            <div className="transcript-bubble">
              {currentTranscript.length > 150
                ? '...' + currentTranscript.slice(-150)
                : currentTranscript}...
            </div>
          </div>
        )}

        {/* Streaming AI response */}
        {currentAiTranscript && (
          <div className="message-row ai">
            <div className="message-avatar ai">
              <RobotOutlined />
            </div>
            <div className="message-content">
              <div className="message-bubble ai streaming">
                {currentAiTranscript}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Status bar */}
      {!readOnly && (status === 'listening' || status === 'ended') && (
        <div className="conversation-status-bar">
          <div className="status-indicator">
            {status === 'listening' && aiSpeaking && (
              <>
                <div className="status-dot ai-speaking" />
                <WaveformBars color="#f59e0b" />
                <span>AI is speaking</span>
              </>
            )}
            {status === 'listening' && !aiSpeaking && (
              <>
                <div className="status-dot listening" />
                <WaveformBars color="#10b981" />
                <span>Listening...</span>
              </>
            )}
            {status === 'ended' && (
              <span style={{ color: '#6b7280' }}>Conversation ended</span>
            )}
          </div>

          {status === 'listening' && (
            <Button danger onClick={onEndConversation} size="middle">
              End Conversation
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
