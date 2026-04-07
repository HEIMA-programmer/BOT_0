/**
 * Shared hook for AI conversation (Free + Guided scenarios).
 * Manages WebSocket connection, audio streaming, message state, and scoring.
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { message } from 'antd';

export default function useConversation() {
  const [status, setStatus] = useState('idle'); // idle | connecting | ready | listening | ended
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [messages, setMessages] = useState([]);
  const [scoringStatus, setScoringStatus] = useState('idle'); // idle | scoring | done | error
  const [scores, setScores] = useState(null);
  const [micMuted, setMicMuted] = useState(false);

  const socketRef = useRef(null);
  const streamRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const recordingContextRef = useRef(null);
  const playbackContextRef = useRef(null);
  const nextPlayTimeRef = useRef(0);
  const optionsRef = useRef(null);
  const statusRef = useRef(status);
  statusRef.current = status; // eslint-disable-line react-hooks/refs -- sync ref with latest status for use in callbacks

  // Track the latest AI transcript text via ref to avoid stale closure issues
  const aiTranscriptRef = useRef('');

  // Track messages array synchronously for event handlers
  const messagesRef = useRef([]);
  // Unique message ID counter
  const msgIdCounterRef = useRef(0);
  const nextMsgId = () => `msg-${Date.now()}-${++msgIdCounterRef.current}`;

  // --- Audio playback (24kHz PCM from Gemini) ---
  const playAudio = useCallback((base64Audio) => {
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

      const now = ctx.currentTime;
      const startTime = Math.max(now, nextPlayTimeRef.current);
      src.start(startTime);
      nextPlayTimeRef.current = startTime + buf.duration;
    } catch (err) {
      console.error('Playback error:', err);
    }
  }, []);

  // --- Mic capture (16kHz PCM) ---
  const startMic = useCallback(async () => {
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
      sourceRef.current = source;
      processorRef.current = processor;
      setStatus('listening');
    } catch (err) {
      console.error('Mic error:', err);
      message.error('Cannot access microphone. Please check permissions.');
    }
  }, []);

  const stopMic = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }, []);

  // --- Connect and start conversation ---
  const connect = useCallback((options = {}) => {
    const { systemPrompt, voiceName, dbSessionId, scenarioType, subScenario } = options;
    optionsRef.current = options;
    setStatus('connecting');
    setMessages([]);
    messagesRef.current = [];
    aiTranscriptRef.current = '';
    msgIdCounterRef.current = 0;
    setScores(null);
    setScoringStatus('idle');
    setMicMuted(false);

    const socket = io('/conversation');
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('start_conversation', {
        system_prompt: systemPrompt,
        voice_name: voiceName,
        db_session_id: dbSessionId,
        scenario_type: scenarioType || 'free_conversation',
        sub_scenario: subScenario,
      });
    });

    socket.on('disconnect', () => {
      if (statusRef.current !== 'ended') {
        setStatus('connecting');
      }
    });

    socket.on('ready', () => {
      setStatus('ready');
      startMic();
    });

    socket.on('ai_audio_chunk', (data) => {
      setAiSpeaking(true);
      if (data.audio) playAudio(data.audio);
    });

    // Accumulate AI transcript via ref (no streaming display)
    socket.on('ai_transcript', (data) => {
      aiTranscriptRef.current = data.text;
    });

    // user_final: finalize user message — always append to end
    socket.on('user_final', (data) => {
      if (data.text) {
        const msg = { id: nextMsgId(), role: 'user', text: data.text, timestamp: new Date() };
        messagesRef.current = [...messagesRef.current, msg];
        setMessages([...messagesRef.current]);
      }
    });

    // ai_speaking_end: finalize AI message — always append to end
    socket.on('ai_speaking_end', () => {
      const text = aiTranscriptRef.current;
      if (text) {
        const cur = messagesRef.current;
        if (!cur.some(m => m.role === 'ai' && m.text === text)) {
          const newMsg = { id: nextMsgId(), role: 'ai', text, timestamp: new Date() };
          messagesRef.current = [...cur, newMsg];
          setMessages([...messagesRef.current]);
        }
      }
      aiTranscriptRef.current = '';
      nextPlayTimeRef.current = 0;
      setAiSpeaking(false);
    });

    socket.on('scoring_started', () => {
      setScoringStatus('scoring');
    });

    socket.on('scoring_complete', (data) => {
      if (data.error) {
        setScoringStatus('error');
        message.error(`Scoring failed: ${data.error}`);
      } else {
        setScores(data.scores);
        setScoringStatus('done');
      }
    });

    socket.on('error', (data) => {
      message.error(data.message || 'An error occurred');
    });
  }, [playAudio, startMic]);

  // --- Toggle mic mute/unmute ---
  const toggleMic = useCallback(() => {
    setMicMuted(prev => {
      const willMute = !prev;
      if (willMute) {
        // Mute: disconnect processor to stop sending audio
        if (processorRef.current) {
          processorRef.current.disconnect();
        }
        if (sourceRef.current) {
          sourceRef.current.disconnect();
        }
        // Signal backend that user's turn is done for faster AI response
        if (socketRef.current) {
          socketRef.current.emit('end_user_turn');
        }
      } else {
        // Unmute: reconnect processor to resume sending audio
        const ctx = recordingContextRef.current;
        const source = sourceRef.current;
        const processor = processorRef.current;
        if (ctx && source && processor) {
          source.connect(processor);
          processor.connect(ctx.destination);
        } else if (streamRef.current && ctx) {
          // Re-create source/processor if needed
          const newSource = ctx.createMediaStreamSource(streamRef.current);
          const newProcessor = ctx.createScriptProcessor(512, 1, 1);
          newProcessor.onaudioprocess = (e) => {
            const input = e.inputBuffer.getChannelData(0);
            const pcm = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) {
              const s = Math.max(-1, Math.min(1, input[i]));
              pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
            }
            const bytes = new Uint8Array(pcm.buffer);
            let binary = '';
            for (let i = 0; i < bytes.length; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            if (socketRef.current) {
              socketRef.current.emit('audio_chunk', { audio: btoa(binary) });
            }
          };
          newSource.connect(newProcessor);
          newProcessor.connect(ctx.destination);
          sourceRef.current = newSource;
          processorRef.current = newProcessor;
        }
      }
      return willMute;
    });
  }, []);

  // --- End conversation ---
  const endConversation = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('end_conversation');
    }
    stopMic();
    setStatus('ended');
  }, [stopMic]);

  // --- Request scoring ---
  const requestScoring = useCallback(() => {
    if (socketRef.current) {
      setScoringStatus('scoring');
      socketRef.current.emit('request_scoring', {
        sub_scenario: optionsRef.current?.subScenario,
      });
    }
  }, []);

  // --- Cleanup on unmount ---
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('end_conversation');
        socketRef.current.disconnect();
      }
      stopMic();
    };
  }, [stopMic]);

  return {
    status,
    aiSpeaking,
    messages,
    scoringStatus,
    scores,
    micMuted,
    connect,
    toggleMic,
    endConversation,
    requestScoring,
  };
}
