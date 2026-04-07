/**
 * Shared conversation chat UI component.
 * Used by Free Conversation and Guided Conversation pages.
 */
import { useEffect, useRef } from 'react';
import { Button } from 'antd';
import { RobotOutlined, UserOutlined, AudioOutlined, AudioMutedOutlined } from '@ant-design/icons';
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
  micMuted,
  onEndConversation,
  onToggleMic,
  readOnly = false,
}) {
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Loading / connecting state — only show full loading on initial connect (no messages yet)
  if ((status === 'connecting' || status === 'ready') && messages.length === 0) {
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
        {messages.length === 0 && status === 'listening' && (
          <div className="conversation-empty">
            <RobotOutlined />
            <div className="typing-dots" style={{ marginTop: 8 }}>
              <span /><span /><span />
            </div>
            <div>AI is preparing to speak...</div>
            <div style={{ fontSize: 12 }}>Please wait a moment</div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id || msg.timestamp} className={`message-row ${msg.role === 'user' ? 'user' : 'ai'}`}>
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

        <div ref={messagesEndRef} />
      </div>

      {/* Status bar */}
      {!readOnly && (status === 'listening' || status === 'ended' || (status === 'connecting' && messages.length > 0)) && (
        <div className="conversation-status-bar">
          <div className="status-indicator">
            {status === 'connecting' && messages.length > 0 && (
              <>
                <div className="status-dot connecting" />
                <span>Reconnecting...</span>
              </>
            )}
            {status === 'listening' && aiSpeaking && (
              <>
                <div className="status-dot ai-speaking" />
                <WaveformBars color="#f59e0b" />
                <span>AI is speaking</span>
              </>
            )}
            {status === 'listening' && !aiSpeaking && !micMuted && (
              <>
                <div className="status-dot listening" />
                <WaveformBars color="#10b981" />
                <span>Listening...</span>
              </>
            )}
            {status === 'listening' && !aiSpeaking && micMuted && (
              <>
                <div className="status-dot" style={{ background: '#9ca3af' }} />
                <span style={{ color: '#9ca3af' }}>Mic muted</span>
              </>
            )}
            {status === 'ended' && (
              <span style={{ color: '#6b7280' }}>Conversation ended</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {status === 'listening' && onToggleMic && (
              <Button
                shape="circle"
                size="middle"
                icon={micMuted ? <AudioMutedOutlined /> : <AudioOutlined />}
                onClick={onToggleMic}
                className={micMuted ? 'mic-btn muted' : 'mic-btn'}
              />
            )}
            {status === 'listening' && (
              <Button danger onClick={onEndConversation} size="middle">
                End Conversation
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
