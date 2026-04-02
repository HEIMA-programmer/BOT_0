import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import {
  Typography, Button, Input, Avatar, Progress, Modal, Space, Tag, App as AntdApp, Radio,
} from 'antd';
import {
  TrophyOutlined, ArrowLeftOutlined, SoundOutlined,
} from '@ant-design/icons';
import { io } from 'socket.io-client';

import { roomAPI, forumAPI } from '../../api/index';
import { getAvatarColor } from '../../utils/roomUtils';
import useWordPronunciation from '../../hooks/useWordPronunciation';

const { Text } = Typography;

const ROUND_TIME = 20;

function toSubmittedPlayerMap(submittedPlayers = []) {
  return Object.fromEntries(
    (submittedPlayers || []).map((playerId) => [Number(playerId), true])
  );
}

function formatCompletionTime(valueInSeconds) {
  const seconds = Number(valueInSeconds);
  if (!Number.isFinite(seconds)) {
    return null;
  }

  return `${seconds.toFixed(1)}s`;
}

function buildOrdinalLabel(rank) {
  if (rank === 1) return '1st';
  if (rank === 2) return '2nd';
  if (rank === 3) return '3rd';
  return `${rank}th`;
}

export default function GameRoom({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: roomIdParam } = useParams();
  const { message } = AntdApp.useApp();

  const { room: roomState, members: initialMembers } = location.state || {};
  const room = roomState || {};
  const roomId = room?.id ? Number(room.id) : Number(roomIdParam);
  const userId = user?.id || 0;

  const isLeavingRef = useRef(false);
  const socketRef = useRef(null);
  const wordInputRef = useRef(null);
  const blankInputRefs = useRef([]);
  const timerRef = useRef(null);
  const membersRef = useRef(initialMembers || []);
  const gameTypeRef = useRef(room.gameType || 'word_duel');

  const { speak, isSupported: isSpeechSupported } = useWordPronunciation('us');
  const speakRef = useRef(speak);

  const [members, setMembers] = useState(initialMembers || []);
  const [gameType, setGameType] = useState(room.gameType || 'word_duel');
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [scores, setScores] = useState({});
  const [submittedPlayers, setSubmittedPlayers] = useState({});
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [answer, setAnswer] = useState('');
  const [blankAnswers, setBlankAnswers] = useState([]);
  const [answerState, setAnswerState] = useState('idle'); // idle | correct | wrong | locked | submitted
  const [gamePhase, setGamePhase] = useState('waiting'); // waiting | playing | roundResult | gameOver
  const [roundResult, setRoundResult] = useState(null);
  const [finalResults, setFinalResults] = useState(null);
  const [roundsLog, setRoundsLog] = useState([]);
  const [showLeave, setShowLeave] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareZone, setShareZone] = useState('public');
  const [shareLoading, setShareLoading] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  useEffect(() => {
    membersRef.current = members;
  }, [members]);

  useEffect(() => {
    gameTypeRef.current = gameType;
  }, [gameType]);

  const isWordDuel = gameType === 'word_duel';
  const isContextGuesser = gameType === 'context_guesser';
  const blankCount = currentQuestion?.blank_count || 0;

  const resetRoundInputs = useCallback((nextQuestion, nextGameType, nextAnswerState) => {
    setAnswer('');
    setBlankAnswers(Array.from({ length: nextQuestion?.blank_count || 0 }, () => ''));

    setTimeout(() => {
      if (nextAnswerState !== 'idle') {
        return;
      }

      if (nextGameType === 'word_duel') {
        wordInputRef.current?.focus();
        return;
      }

      blankInputRefs.current[0]?.focus();
    }, 200);
  }, []);

  const applyGameState = useCallback((data) => {
    const nextMembers = data.members?.length ? data.members : membersRef.current;
    const nextScores = {};

    nextMembers.forEach((member) => {
      nextScores[member.user_id] = data.scores?.[member.user_id] || 0;
    });

    const submittedMap = toSubmittedPlayerMap(data.submitted_players);
    const nextAnswerState = submittedMap[userId]
      ? (data.game_type === 'context_guesser' ? 'submitted' : 'locked')
      : 'idle';

    setGameType(data.game_type);
    setTotalRounds(data.total_rounds);
    setCurrentRound(data.round);
    setCurrentQuestion(data.question);
    setMembers(nextMembers);
    setScores(nextScores);
    setSubmittedPlayers(submittedMap);
    setTimeLeft(data.remaining_time ?? ROUND_TIME);
    setRoundResult(null);
    setFinalResults(null);
    setAnswerState(nextAnswerState);
    setGamePhase('playing');
    resetRoundInputs(data.question, data.game_type, nextAnswerState);
  }, [resetRoundInputs, userId]);

  useEffect(() => {
    const socket = io('/room', { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_waiting_room', { room_id: roomId });
      socket.emit('request_game_state', { room_id: roomId });
    });

    socket.on('game_started', applyGameState);
    socket.on('game_state_sync', applyGameState);
    socket.on('next_round', applyGameState);

    socket.on('answer_result', (data) => {
      if (gameTypeRef.current === 'context_guesser') {
        if (data.submitted) {
          setAnswerState('submitted');
        }
        return;
      }

      if (data.correct) {
        setAnswerState('correct');
      } else {
        setAnswerState('wrong');
        setShakeKey((key) => key + 1);
        if (data.locked) {
          setTimeout(() => setAnswerState('locked'), 600);
        } else {
          setTimeout(() => {
            setAnswer('');
            setAnswerState('idle');
            wordInputRef.current?.focus();
          }, 600);
        }
      }
    });

    socket.on('player_answered', (data) => {
      if (data.user_id == null) {
        return;
      }

      if (data.submitted) {
        setSubmittedPlayers((prev) => ({ ...prev, [data.user_id]: true }));
      }
    });

    socket.on('round_ended', (data) => {
      clearInterval(timerRef.current);
      setSubmittedPlayers({});
      setScores(data.scores || {});
      setRoundResult(data);
      setGamePhase('roundResult');
    });

    socket.on('game_over', (data) => {
      clearInterval(timerRef.current);
      setSubmittedPlayers({});
      setRoundResult(null);
      setFinalResults(data.results || []);
      setRoundsLog(data.rounds_log || []);
      setGamePhase('gameOver');
    });

    socket.on('room_error', ({ message: errorMessage }) => {
      if (errorMessage) {
        message.error(errorMessage);
      }
    });

    return () => {
      clearInterval(timerRef.current);
      window.speechSynthesis?.cancel?.();
      socket.disconnect();
    };
  }, [applyGameState, message, roomId]);

  useEffect(() => {
    if (gamePhase !== 'playing') {
      return undefined;
    }

    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((previousTime) => {
        if (previousTime <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return previousTime - 1;
      });
    }, 1000);

    return () => clearInterval(timerRef.current);
  }, [gamePhase, currentRound]);

  useEffect(() => {
    if (!isContextGuesser || gamePhase !== 'playing' || !currentQuestion?.spoken_text) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      speakRef.current?.(currentQuestion.spoken_text);
    }, 350);

    return () => clearTimeout(timeoutId);
  }, [currentQuestion?.spoken_text, currentRound, gamePhase, isContextGuesser]);

  const handleReplayAudio = useCallback(() => {
    if (!currentQuestion?.spoken_text) {
      return;
    }
    speakRef.current?.(currentQuestion.spoken_text);
  }, [currentQuestion]);

  const handleContextAnswerChange = useCallback((index, value) => {
    setBlankAnswers((previous) => previous.map((item, itemIndex) => (
      itemIndex === index ? value : item
    )));
  }, []);

  const handleSubmit = useCallback(() => {
    if (gamePhase !== 'playing') {
      return;
    }

    if (isWordDuel) {
      if (answerState === 'locked' || answerState === 'correct' || !answer.trim()) {
        return;
      }

      socketRef.current?.emit('submit_answer', {
        room_id: roomId,
        answer: answer.trim(),
      });
      return;
    }

    if (answerState === 'submitted' || !blankAnswers.some((item) => item.trim())) {
      return;
    }

    socketRef.current?.emit('submit_answer', {
      room_id: roomId,
      answers: blankAnswers.map((item) => item.trim()),
    });
  }, [answer, answerState, blankAnswers, gamePhase, isWordDuel, roomId]);

  const handleShareToForum = useCallback(async () => {
    setShareLoading(true);
    try {
      const isWordDuelType = gameTypeRef.current === 'word_duel';
      const gameLabel = isWordDuelType ? 'Word Duel' : 'Context Guesser';
      const winner = finalResults?.[0]?.username || 'Unknown';
      const title = `Game Record: ${gameLabel} — ${winner} wins!`;

      // Build player name lookup
      const playerNames = {};
      for (const r of (finalResults || [])) {
        playerNames[r.user_id] = r.username;
      }

      // Final standings
      const lines = (finalResults || []).map((r, i) => {
        const medals = ['🥇', '🥈', '🥉'];
        const prefix = medals[i] || `${i + 1}.`;
        const time = formatCompletionTime(r.completion_secs);
        return `${prefix} **${r.username}**: ${r.score} pts${time ? ` (${time})` : ''}`;
      });

      let content = `🎮 **${gameLabel}** — Final Results\n\n${lines.join('\n')}`;

      // Round-by-round details
      if (roundsLog && roundsLog.length > 0) {
        content += '\n\n---\n\n📝 **Round-by-Round Details**\n';

        roundsLog.forEach((round, idx) => {
          content += `\n**Round ${idx + 1}**\n`;

          // Question
          const question = round.question || round.sentence || '';
          if (question) {
            content += `Q: ${question}\n`;
          }
          if (round.revealed_sentence) {
            content += `Sentence: ${round.revealed_sentence}\n`;
          }

          // Correct answer
          const correctAnswer = Array.isArray(round.correct_answers)
            ? round.correct_answers.join(', ')
            : round.correct_answer || '';
          if (correctAnswer) {
            content += `✅ Correct answer: \`${correctAnswer}\`\n`;
          }

          // Each player's answer
          if (round.answers) {
            for (const [uid, submission] of Object.entries(round.answers)) {
              const name = playerNames[uid] || playerNames[Number(uid)] || `Player ${uid}`;
              if (!isWordDuelType && Array.isArray(submission?.answers)) {
                // Context Guesser: multiple blanks
                const parts = submission.answers.map((ans, i) => {
                  const ok = submission.correct_mask?.[i];
                  return ok ? `${ans} ✅` : `${ans} ❌`;
                });
                content += `- ${name}: ${parts.join(', ')}\n`;
              } else {
                // Word Duel: single answer
                const ans = submission?.answer ?? submission;
                const isCorrect = submission?.correct ?? (round.winner_user_id === Number(uid));
                content += `- ${name}: ${ans || '(no answer)'} ${isCorrect ? '✅' : '❌'}\n`;
              }
            }
          }
        });
      }

      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('zone', shareZone);
      formData.append('tag', 'game');
      formData.append('room_id', roomId);

      await forumAPI.createPost(formData);
      message.success('Game record shared to forum!');
      setShared(true);
      setShowShareModal(false);
    } catch {
      message.error('Failed to share game record');
    } finally {
      setShareLoading(false);
    }
  }, [finalResults, roundsLog, shareZone, message, roomId]);

  const handleLeave = useCallback(async () => {
    if (isLeavingRef.current) {
      return;
    }

    isLeavingRef.current = true;
    window.speechSynthesis?.cancel?.();

    try {
      await roomAPI.leave(roomId);
    } catch {
      // Ignore leave failures so the user can still return to the lobby.
    }

    navigate('/room');
  }, [navigate, roomId]);

  const handleReturnToRoom = useCallback(() => {
    isLeavingRef.current = true;
    window.speechSynthesis?.cancel?.();
    navigate(`/room/${roomId}/waiting`, { state: { room } });
  }, [navigate, roomId, room]);

  const sortedScores = members
    .map((member) => ({ ...member, score: scores[member.user_id] || 0 }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return (left.username || '').localeCompare(right.username || '');
    });

  const sentenceParts = currentQuestion?.sentence?.split('_____') || [];

  return (
    <>
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-5px); }
          80% { transform: translateX(5px); }
        }

        .shake-anim {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>

      <div style={{ height: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          background: '#1e293b',
          padding: '10px 20px',
          borderBottom: '1px solid #334155',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, overflowX: 'auto' }}>
            {sortedScores.map((member, index) => {
              const isMe = member.user_id === userId;
              const hasSubmitted = Boolean(submittedPlayers[member.user_id]);

              return (
                <div
                  key={member.user_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: isMe ? '#1e3a5f' : '#334155',
                    borderRadius: 8,
                    padding: '6px 12px',
                    flexShrink: 0,
                    border: index === 0 ? '1px solid #d9770640' : '1px solid transparent',
                  }}
                >
                  {index === 0 && <TrophyOutlined style={{ color: '#d97706', fontSize: 12 }} />}
                  <Avatar size={24} style={{ background: getAvatarColor(member.username), fontSize: 11, fontWeight: 700 }}>
                    {member.username?.charAt(0)?.toUpperCase()}
                  </Avatar>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Text style={{ color: '#e2e8f0', fontSize: 13 }}>
                      {member.username}
                    </Text>
                    {isContextGuesser && hasSubmitted && gamePhase === 'playing' && (
                      <Text style={{ color: '#38bdf8', fontSize: 11 }}>
                        Submitted
                      </Text>
                    )}
                  </div>
                  <Text style={{ color: '#f59e0b', fontWeight: 700, fontSize: 16, minWidth: 24, textAlign: 'right' }}>
                    {member.score}
                  </Text>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <Text style={{ color: '#64748b', fontSize: 12 }}>
              Round {currentRound + 1}/{totalRounds}
            </Text>
            <Button
              size="small"
              icon={<ArrowLeftOutlined />}
              onClick={() => setShowLeave(true)}
              style={{ background: 'transparent', borderColor: '#475569', color: '#94a3b8' }}
            />
          </div>
        </div>

        <div style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          position: 'relative',
        }}>
          {gamePhase === 'waiting' ? (
            <Text style={{ color: '#64748b', fontSize: 18 }}>Waiting for game to start...</Text>
          ) : (
            <>
              <div style={{ position: 'absolute', top: 20, right: 20 }}>
                <Progress
                  type="circle"
                  percent={(timeLeft / ROUND_TIME) * 100}
                  format={() => (
                    <span style={{ color: timeLeft <= 5 ? '#ef4444' : '#f1f5f9', fontSize: 16, fontWeight: 700 }}>
                      {timeLeft}
                    </span>
                  )}
                  strokeColor={timeLeft <= 5 ? '#ef4444' : '#2563eb'}
                  trailColor="#334155"
                  size={72}
                />
              </div>

              {currentQuestion && (
                <div style={{ maxWidth: 760, width: '100%', textAlign: 'center' }}>
                  <Tag color={isWordDuel ? 'blue' : 'orange'} style={{ marginBottom: 16, fontSize: 12, borderRadius: 6 }}>
                    {isWordDuel ? 'Word Duel' : 'Context Guesser'}
                  </Tag>

                  <div style={{
                    background: '#1e293b',
                    borderRadius: 16,
                    padding: '28px 32px',
                    border: '1px solid #334155',
                    marginBottom: 24,
                  }}>
                    {isWordDuel ? (
                      <>
                        <Text style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 8 }}>
                          What word matches this definition?
                        </Text>
                        <Text style={{ color: '#f1f5f9', fontSize: 20, lineHeight: '1.6', fontWeight: 400 }}>
                          {currentQuestion.question}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 10 }}>
                          Fill the missing words. Each correct blank is worth 1 point.
                        </Text>
                        <Text style={{ color: '#f1f5f9', fontSize: 18, lineHeight: '2.2' }}>
                          {sentenceParts.map((part, index) => (
                            <span key={`${part}-${index}`}>
                              {part}
                              {index < sentenceParts.length - 1 && (
                                <span style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  minWidth: 96,
                                  padding: '0 12px',
                                  margin: '0 6px',
                                  borderBottom: '2px solid #fb923c',
                                  color: '#fdba74',
                                  fontSize: 14,
                                  fontWeight: 700,
                                }}
                                >
                                  {index + 1}
                                </span>
                              )}
                            </span>
                          ))}
                        </Text>

                        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
                          <Button
                            icon={<SoundOutlined />}
                            onClick={handleReplayAudio}
                            style={{ background: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
                          >
                            Replay Audio
                          </Button>
                          {!isSpeechSupported && (
                            <Text style={{ color: '#64748b', fontSize: 12 }}>
                              Browser speech playback is unavailable in this session.
                            </Text>
                          )}
                        </div>
                      </>
                    )}
                  </div>

                  <div
                    key={shakeKey}
                    className={answerState === 'wrong' ? 'shake-anim' : ''}
                    style={{ display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}
                  >
                    {isWordDuel ? (
                      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', width: '100%' }}>
                        <Input
                          ref={wordInputRef}
                          size="large"
                          placeholder="Type your answer..."
                          value={answer}
                          onChange={(event) => setAnswer(event.target.value)}
                          onPressEnter={handleSubmit}
                          disabled={answerState === 'locked' || answerState === 'correct' || gamePhase !== 'playing'}
                          autoFocus
                          style={{
                            maxWidth: 340,
                            background: answerState === 'correct' ? '#052e16' : answerState === 'wrong' ? '#450a0a' : '#1e293b',
                            borderColor: answerState === 'correct' ? '#22c55e' : answerState === 'wrong' ? '#ef4444' : '#334155',
                            color: '#f1f5f9',
                            fontSize: 16,
                            borderRadius: 10,
                            transition: 'all 0.2s',
                          }}
                        />
                        <Button
                          type="primary"
                          size="large"
                          onClick={handleSubmit}
                          disabled={!answer.trim() || answerState === 'locked' || answerState === 'correct' || gamePhase !== 'playing'}
                          style={{ borderRadius: 10, minWidth: 80 }}
                        >
                          Submit
                        </Button>
                      </div>
                    ) : (
                      <>
                        <div style={{
                          width: '100%',
                          display: 'grid',
                          gridTemplateColumns: blankCount > 1 ? 'repeat(2, minmax(0, 1fr))' : 'minmax(0, 1fr)',
                          gap: 12,
                          maxWidth: 560,
                        }}>
                          {Array.from({ length: blankCount }).map((_, index) => (
                            <div key={`blank-${index}`} style={{ textAlign: 'left' }}>
                              <Text style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>
                                Blank {index + 1}
                              </Text>
                              <Input
                                ref={(node) => {
                                  blankInputRefs.current[index] = node;
                                }}
                                size="large"
                                placeholder={`Word ${index + 1}`}
                                value={blankAnswers[index] || ''}
                                onChange={(event) => handleContextAnswerChange(index, event.target.value)}
                                onPressEnter={handleSubmit}
                                disabled={answerState === 'submitted' || gamePhase !== 'playing'}
                                style={{
                                  background: answerState === 'submitted' ? '#0b253a' : '#1e293b',
                                  borderColor: answerState === 'submitted' ? '#38bdf8' : '#334155',
                                  color: '#f1f5f9',
                                  borderRadius: 10,
                                }}
                              />
                            </div>
                          ))}
                        </div>

                        <Button
                          type="primary"
                          size="large"
                          onClick={handleSubmit}
                          disabled={!blankAnswers.some((item) => item.trim()) || answerState === 'submitted' || gamePhase !== 'playing'}
                          style={{ borderRadius: 10, minWidth: 132 }}
                        >
                          Submit Answers
                        </Button>
                      </>
                    )}
                  </div>

                  {answerState === 'locked' && gamePhase === 'playing' && (
                    <Text style={{ color: '#64748b', fontSize: 13, marginTop: 12, display: 'block' }}>
                      Waiting for the next round...
                    </Text>
                  )}

                  {answerState === 'submitted' && gamePhase === 'playing' && (
                    <Text style={{ color: '#38bdf8', fontSize: 13, marginTop: 12, display: 'block' }}>
                      Submitted. Waiting for the rest of the room...
                    </Text>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {roundResult && gamePhase === 'roundResult' && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20,
          }}>
            <div style={{
              background: '#1e293b',
              borderRadius: 20,
              padding: '32px 40px',
              textAlign: 'center',
              minWidth: 340,
              maxWidth: 720,
              width: '100%',
              border: '1px solid #334155',
            }}>
              {isWordDuel ? (
                <>
                  <Text style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 8 }}>
                    Correct Answer
                  </Text>
                  <Text style={{ color: '#34d399', fontSize: 28, fontWeight: 700, display: 'block' }}>
                    {roundResult.correct_answer}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 8 }}>
                    Complete Sentence
                  </Text>
                  <Text style={{ color: '#f1f5f9', fontSize: 20, lineHeight: '1.7', display: 'block' }}>
                    {roundResult.revealed_sentence}
                  </Text>
                  <Text style={{ color: '#fb923c', fontSize: 14, display: 'block', marginTop: 14 }}>
                    Correct words: {(roundResult.correct_answers || []).join(', ')}
                  </Text>
                </>
              )}

              {roundResult.explanation && (
                <Text style={{ color: '#64748b', fontSize: 13, display: 'block', margin: '8px 0 20px', lineHeight: '1.5' }}>
                  {roundResult.explanation}
                </Text>
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' }}>
                {members.map((member) => (
                  <div key={member.user_id} style={{ textAlign: 'center', minWidth: 72 }}>
                    <Avatar size={32} style={{ background: getAvatarColor(member.username), fontWeight: 700, fontSize: 13 }}>
                      {member.username?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <Text style={{
                      display: 'block',
                      fontSize: 16,
                      fontWeight: 700,
                      color: (roundResult.points?.[member.user_id] || 0) > 0 ? '#fbbf24' : '#475569',
                      marginTop: 4,
                    }}
                    >
                      +{roundResult.points?.[member.user_id] || 0}
                    </Text>
                  </div>
                ))}
              </div>

              <Text style={{ color: '#475569', fontSize: 12, marginTop: 16, display: 'block' }}>
                Next round in a moment...
              </Text>
            </div>
          </div>
        )}

        {gamePhase === 'gameOver' && finalResults && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
          }}>
            <div style={{ textAlign: 'center', maxWidth: 520, width: '100%', padding: '0 24px' }}>
              <div style={{ fontSize: 56, marginBottom: 8 }}>🏆</div>
              <Text style={{ color: '#fbbf24', fontSize: 22, fontWeight: 700, display: 'block' }}>
                {finalResults[0]?.username || 'Winner'} Wins!
              </Text>
              <Text style={{ color: '#64748b', fontSize: 14, display: 'block', marginBottom: 28 }}>
                Final Results
              </Text>

              <div style={{
                background: '#1e293b',
                borderRadius: 16,
                overflow: 'hidden',
                border: '1px solid #334155',
                marginBottom: 24,
              }}>
                {finalResults.map((result, index) => {
                  const isMe = result.user_id === userId;
                  const completionLabel = formatCompletionTime(result.completion_secs);

                  return (
                    <div
                      key={result.user_id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '14px 20px',
                        background: index === 0 ? '#1c1917' : isMe ? '#1e3a5f20' : 'transparent',
                        borderBottom: index < finalResults.length - 1 ? '1px solid #334155' : 'none',
                      }}
                    >
                      <Text style={{ color: index === 0 ? '#fbbf24' : '#475569', fontWeight: 700, fontSize: 18, width: 36 }}>
                        {buildOrdinalLabel(index + 1)}
                      </Text>
                      <Avatar size={36} style={{ background: getAvatarColor(result.username), fontSize: 15, fontWeight: 700 }}>
                        {result.username?.charAt(0)?.toUpperCase()}
                      </Avatar>
                      <div style={{ flex: 1, textAlign: 'left' }}>
                        <Text style={{ color: '#e2e8f0', display: 'block', fontSize: 15 }}>
                          {result.username}{isMe ? ' (You)' : ''}
                        </Text>
                        {completionLabel && (
                          <Text style={{ color: '#64748b', fontSize: 12 }}>
                            Completion time: {completionLabel}
                          </Text>
                        )}
                      </div>
                      <Text style={{ color: '#fbbf24', fontWeight: 700, fontSize: 20 }}>
                        {result.score}
                      </Text>
                    </div>
                  );
                })}
              </div>

              <Space size={12}>
                <Button
                  size="large"
                  disabled={shared}
                  onClick={() => setShowShareModal(true)}
                  style={{ borderRadius: 8, borderColor: '#3b82f6', color: '#3b82f6' }}
                >
                  {shared ? 'Shared' : 'Share to Forum'}
                </Button>
                <Button
                  size="large"
                  onClick={handleReturnToRoom}
                  style={{ borderRadius: 8 }}
                >
                  Back to Room
                </Button>
                <Button
                  type="primary"
                  size="large"
                  onClick={handleLeave}
                  style={{ borderRadius: 8 }}
                >
                  Back to Lobby
                </Button>
              </Space>
            </div>
          </div>
        )}

        <Modal
          title="Leave Game?"
          open={showLeave}
          onCancel={() => setShowLeave(false)}
          onOk={handleLeave}
          okText="Leave"
          okButtonProps={{ danger: true }}
          width={340}
        >
          <Text>Are you sure you want to leave the game?</Text>
        </Modal>

        <Modal
          title="Share Game Record to Forum"
          open={showShareModal}
          onCancel={() => setShowShareModal(false)}
          onOk={handleShareToForum}
          okText="Share"
          okButtonProps={{ loading: shareLoading }}
          width={380}
        >
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>
              Post will be tagged with <Tag color="blue">game</Tag> automatically.
            </Text>
          </div>
          <div>
            <Text style={{ fontSize: 13, display: 'block', marginBottom: 8 }}>Visibility</Text>
            <Radio.Group value={shareZone} onChange={e => setShareZone(e.target.value)}>
              <Radio value="public">Public</Radio>
              <Radio value="friend">Friends Only</Radio>
            </Radio.Group>
          </div>
        </Modal>
      </div>
    </>
  );
}
