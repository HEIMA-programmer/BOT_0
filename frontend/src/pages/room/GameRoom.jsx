import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Typography, Button, Input, Avatar, Progress, Modal, Space, Tag } from 'antd';
import { roomAPI } from '../../api/index';
import { TrophyOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { io } from 'socket.io-client';
import { getAvatarColor } from '../../utils/roomUtils';

const { Text, Title } = Typography;

const ROUND_TIME = 20;

export default function GameRoom({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: roomIdParam } = useParams();
  const { room: r, members: initMembers } = location.state || {};
  const room = r || {};
  const roomId = room?.id ? Number(room.id) : Number(roomIdParam);

  const userId = user?.id || 0;
  const isLeavingRef = useRef(false);
  const socketRef = useRef(null);
  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const [members, setMembers] = useState(initMembers || []);
  const [gameType, setGameType] = useState(room.gameType || 'word_duel');
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [scores, setScores] = useState({});
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [answer, setAnswer] = useState('');
  const [answerState, setAnswerState] = useState('idle'); // idle | correct | wrong | locked
  const [gamePhase, setGamePhase] = useState('waiting'); // waiting | playing | roundResult | gameOver
  const [roundResult, setRoundResult] = useState(null);
  const [finalResults, setFinalResults] = useState(null);
  const [showLeave, setShowLeave] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const isWordDuel = gameType === 'word_duel';
  const isHost = members.find(mb => mb.user_id === userId)?.role === 'host';

  // Connect to socket
  useEffect(() => {
    const socket = io('/room', { withCredentials: true });
    socketRef.current = socket;

    const applyGameState = (data) => {
      setGameType(data.game_type);
      setTotalRounds(data.total_rounds);
      setCurrentRound(data.round);
      setCurrentQuestion(data.question);
      if (data.members?.length) setMembers(data.members);
      const newScores = {};
      (data.members || []).forEach(m => { newScores[m.user_id] = data.scores?.[m.user_id] || 0; });
      setScores(newScores);
      setGamePhase('playing');
      setTimeLeft(ROUND_TIME);
      setAnswer('');
      setAnswerState('idle');
      setTimeout(() => inputRef.current?.focus(), 200);
    };

    socket.on('connect', () => {
      socket.emit('join_waiting_room', { room_id: roomId });
      // Request current game state in case we missed game_started
      socket.emit('request_game_state', { room_id: roomId });
    });

    socket.on('game_started', applyGameState);
    socket.on('game_state_sync', applyGameState);

    socket.on('answer_result', (data) => {
      if (data.correct) {
        setAnswerState('correct');
      } else {
        setAnswerState('wrong');
        setShakeKey(k => k + 1);
        if (data.locked) {
          setTimeout(() => setAnswerState('locked'), 600);
        } else {
          setTimeout(() => {
            setAnswer('');
            setAnswerState('idle');
            inputRef.current?.focus();
          }, 600);
        }
      }
    });

    socket.on('round_ended', (data) => {
      clearInterval(timerRef.current);
      setScores(data.scores || {});
      setRoundResult({
        correctAnswer: data.correct_answer,
        explanation: data.explanation,
        winnerUserId: data.winner_user_id,
        points: data.points || {},
      });
      setGamePhase('roundResult');
    });

    socket.on('next_round', (data) => {
      setCurrentRound(data.round);
      setCurrentQuestion(data.question);
      setScores(data.scores || {});
      setAnswer('');
      setAnswerState('idle');
      setRoundResult(null);
      setGamePhase('playing');
      setTimeLeft(ROUND_TIME);
      setTimeout(() => inputRef.current?.focus(), 200);
    });

    socket.on('game_over', (data) => {
      clearInterval(timerRef.current);
      setRoundResult(null);
      setFinalResults(data.results || []);
      setGamePhase('gameOver');
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId]);

  // Countdown timer
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gamePhase, currentRound]);

  const handleSubmit = useCallback(() => {
    if (answerState === 'locked' || answerState === 'correct' || !answer.trim()) return;
    socketRef.current?.emit('submit_answer', {
      room_id: roomId,
      answer: answer.trim(),
    });
  }, [answer, answerState, roomId]);

  const handleLeave = useCallback(async () => {
    if (isLeavingRef.current) return;
    isLeavingRef.current = true;
    try { await roomAPI.leave(roomId); } catch {}
    navigate('/room');
  }, [roomId, navigate]);

  // Sort scores for display
  const sortedScores = members
    .map(m => ({ ...m, score: scores[m.user_id] || 0 }))
    .sort((a, b) => b.score - a.score);

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
        .shake-anim { animation: shake 0.5s ease-in-out; }
      `}</style>

      <div style={{ height: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Scoreboard */}
        <div style={{
          background: '#1e293b', padding: '10px 20px',
          borderBottom: '1px solid #334155', flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, overflowX: 'auto' }}>
            {sortedScores.map((member, idx) => {
              const isMe = member.user_id === userId;
              return (
                <div
                  key={member.user_id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: isMe ? '#1e3a5f' : '#334155',
                    borderRadius: 8, padding: '6px 12px', flexShrink: 0,
                    border: idx === 0 ? '1px solid #d9770640' : '1px solid transparent',
                  }}
                >
                  {idx === 0 && <TrophyOutlined style={{ color: '#d97706', fontSize: 12 }} />}
                  <Avatar size={24} style={{ background: getAvatarColor(member.username), fontSize: 11, fontWeight: 700 }}>
                    {member.username?.charAt(0)?.toUpperCase()}
                  </Avatar>
                  <Text style={{ color: '#e2e8f0', fontSize: 13 }}>{member.username}</Text>
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

        {/* Game Area */}
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', position: 'relative',
        }}>
          {gamePhase === 'waiting' ? (
            <Text style={{ color: '#64748b', fontSize: 18 }}>Waiting for game to start...</Text>
          ) : (
            <>
              {/* Timer */}
              <div style={{ position: 'absolute', top: 20, right: 20 }}>
                <Progress
                  type="circle"
                  percent={(timeLeft / ROUND_TIME) * 100}
                  format={() => <span style={{ color: timeLeft <= 5 ? '#ef4444' : '#f1f5f9', fontSize: 16, fontWeight: 700 }}>{timeLeft}</span>}
                  strokeColor={timeLeft <= 5 ? '#ef4444' : '#2563eb'}
                  trailColor="#334155"
                  size={72}
                />
              </div>

              {/* Question & Answer */}
              {currentQuestion && (
                <div style={{ maxWidth: 600, width: '100%', textAlign: 'center' }}>
                  <Tag color={isWordDuel ? 'blue' : 'purple'} style={{ marginBottom: 16, fontSize: 12, borderRadius: 6 }}>
                    {isWordDuel ? 'Word Duel' : 'Context Guesser'}
                  </Tag>

                  {isWordDuel ? (
                    <div style={{
                      background: '#1e293b', borderRadius: 16, padding: '28px 32px',
                      border: '1px solid #334155', marginBottom: 24,
                    }}>
                      <Text style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 8 }}>
                        What word matches this definition?
                      </Text>
                      <Text style={{ color: '#f1f5f9', fontSize: 20, lineHeight: '1.6', fontWeight: 400 }}>
                        {currentQuestion.question}
                      </Text>
                    </div>
                  ) : (
                    <div style={{
                      background: '#1e293b', borderRadius: 16, padding: '28px 32px',
                      border: '1px solid #334155', marginBottom: 24,
                    }}>
                      <Text style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 8 }}>
                        Fill in the blank
                      </Text>
                      <Text style={{ color: '#f1f5f9', fontSize: 18, lineHeight: '1.8' }}>
                        {currentQuestion.sentence?.split('_____').map((part, i, arr) => (
                          <span key={i}>
                            {part}
                            {i < arr.length - 1 && (
                              <span style={{
                                display: 'inline-block', minWidth: 100, borderBottom: '2px solid #2563eb',
                                marginInline: 4, verticalAlign: 'bottom',
                              }} />
                            )}
                          </span>
                        ))}
                      </Text>
                    </div>
                  )}

                  {/* Input */}
                  <div
                    key={shakeKey}
                    className={answerState === 'wrong' ? 'shake-anim' : ''}
                    style={{ display: 'flex', gap: 10, justifyContent: 'center' }}
                  >
                    <Input
                      ref={inputRef}
                      size="large"
                      placeholder="Type your answer..."
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      onPressEnter={handleSubmit}
                      disabled={answerState === 'locked' || answerState === 'correct' || gamePhase !== 'playing'}
                      autoFocus
                      style={{
                        maxWidth: 340,
                        background: answerState === 'correct' ? '#052e16' : answerState === 'wrong' ? '#450a0a' : '#1e293b',
                        borderColor: answerState === 'correct' ? '#22c55e' : answerState === 'wrong' ? '#ef4444' : '#334155',
                        color: '#f1f5f9', fontSize: 16, borderRadius: 10,
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

                  {answerState === 'locked' && gamePhase === 'playing' && (
                    <Text style={{ color: '#64748b', fontSize: 13, marginTop: 12, display: 'block' }}>
                      Waiting for other players or timer...
                    </Text>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Round Result Overlay */}
        {roundResult && gamePhase === 'roundResult' && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
          }}>
            <div style={{
              background: '#1e293b', borderRadius: 20, padding: '32px 40px',
              textAlign: 'center', minWidth: 340, border: '1px solid #334155',
            }}>
              <Text style={{ color: '#94a3b8', fontSize: 13, display: 'block', marginBottom: 8 }}>Correct Answer</Text>
              <Text style={{ color: '#34d399', fontSize: 28, fontWeight: 700, display: 'block' }}>
                {roundResult.correctAnswer}
              </Text>
              {roundResult.explanation && (
                <Text style={{ color: '#64748b', fontSize: 13, display: 'block', margin: '8px 0 20px', lineHeight: '1.5' }}>
                  {roundResult.explanation}
                </Text>
              )}
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 16 }}>
                {members.map(m => (
                  <div key={m.user_id} style={{ textAlign: 'center' }}>
                    <Avatar size={32} style={{ background: getAvatarColor(m.username), fontWeight: 700, fontSize: 13 }}>
                      {m.username?.charAt(0)?.toUpperCase()}
                    </Avatar>
                    <Text style={{
                      display: 'block', fontSize: 16, fontWeight: 700,
                      color: (roundResult.points?.[m.user_id] || 0) > 0 ? '#fbbf24' : '#475569',
                      marginTop: 4,
                    }}>
                      {(roundResult.points?.[m.user_id] || 0) > 0 ? '+1' : '+0'}
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

        {/* Game Over Screen */}
        {gamePhase === 'gameOver' && finalResults && (
          <div style={{
            position: 'fixed', inset: 0, background: '#0f172a',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
          }}>
            <div style={{ textAlign: 'center', maxWidth: 440, width: '100%', padding: '0 24px' }}>
              <div style={{ fontSize: 56, marginBottom: 8 }}>🏆</div>
              <Text style={{ color: '#fbbf24', fontSize: 22, fontWeight: 700, display: 'block' }}>
                {finalResults[0]?.username || 'Winner'} Wins!
              </Text>
              <Text style={{ color: '#64748b', fontSize: 14, display: 'block', marginBottom: 28 }}>
                Final Results
              </Text>

              <div style={{
                background: '#1e293b', borderRadius: 16, overflow: 'hidden',
                border: '1px solid #334155', marginBottom: 24,
              }}>
                {finalResults.map((result, idx) => {
                  const isMe = result.user_id === userId;
                  return (
                    <div
                      key={result.user_id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 20px',
                        background: idx === 0 ? '#1c1917' : isMe ? '#1e3a5f20' : 'transparent',
                        borderBottom: idx < finalResults.length - 1 ? '1px solid #334155' : 'none',
                      }}
                    >
                      <Text style={{ color: idx === 0 ? '#fbbf24' : '#475569', fontWeight: 700, fontSize: 18, width: 28 }}>
                        {idx + 1}
                      </Text>
                      <Avatar size={36} style={{ background: getAvatarColor(result.username), fontSize: 15, fontWeight: 700 }}>
                        {result.username?.charAt(0)?.toUpperCase()}
                      </Avatar>
                      <Text style={{ color: '#e2e8f0', flex: 1, fontSize: 15 }}>
                        {result.username}{isMe ? ' (You)' : ''}
                      </Text>
                      <Text style={{ color: '#fbbf24', fontWeight: 700, fontSize: 20 }}>
                        {result.score}
                      </Text>
                    </div>
                  );
                })}
              </div>

              <Space size={12}>
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

        {/* Leave Confirmation */}
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
      </div>
    </>
  );
}
