import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Typography, Button, Input, Avatar, Progress, Modal, Space, Tag } from 'antd';
import { TrophyOutlined, ArrowLeftOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const AVATAR_COLORS = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed', '#db2777', '#0891b2', '#d97706'];
function getAvatarColor(username = '') {
  let hash = 0;
  for (let i = 0; i < username.length; i++) hash += username.charCodeAt(i);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

const WORD_DUEL_QUESTIONS = [
  { id: 1, question: 'The process of making something better or more effective over time.', answer: 'improve' },
  { id: 2, question: 'To carefully examine something to understand or explain it.', answer: 'analyze' },
  { id: 3, question: 'The basic features or principles of a subject.', answer: 'fundamental' },
  { id: 4, question: 'To make something less severe or serious.', answer: 'mitigate' },
  { id: 5, question: 'A general agreement or opinion shared by a group.', answer: 'consensus' },
];

const CONTEXT_QUESTIONS = [
  {
    id: 1,
    sentence: 'The scientist made a _____ discovery that changed the entire field of medicine.',
    answer: 'significant',
    explanation: '"Significant" means important or noteworthy — something that has a major impact.',
  },
  {
    id: 2,
    sentence: 'Students must _____ a minimum of 30 credits to graduate from the program.',
    answer: 'accumulate',
    explanation: '"Accumulate" means to gather or collect something over time.',
  },
  {
    id: 3,
    sentence: 'The professor gave a _____ lecture that helped students grasp the complex topic.',
    answer: 'comprehensive',
    explanation: '"Comprehensive" means covering all aspects of a subject thoroughly.',
  },
  {
    id: 4,
    sentence: 'The new policy will _____ affect thousands of students across the university.',
    answer: 'significantly',
    explanation: '"Significantly" is the adverb form meaning to a large or important degree.',
  },
];

const MOCK_ROOM = { id: 'demo', name: 'Word Duel Battle', type: 'game', hostId: 1, gameType: 'word_duel' };
const MOCK_MEMBERS = [
  { id: 1, username: 'Alice', role: 'host' },
  { id: 2, username: 'Bob', role: 'member' },
  { id: 0, username: 'You', role: 'member' },
];

const ROUND_TIME = 20;

export default function GameRoom({ user }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { room: r, members: m } = location.state || {};
  const room = r || MOCK_ROOM;
  const members = m || MOCK_MEMBERS;

  const userId = user?.id || 0;
  const isHost = room.hostId === userId;
  const gameType = room.gameType || 'word_duel';
  const questions = gameType === 'word_duel' ? WORD_DUEL_QUESTIONS : CONTEXT_QUESTIONS;
  const totalRounds = gameType === 'word_duel' ? 5 : questions.length;

  const [scores, setScores] = useState(
    Object.fromEntries(members.map(m => [m.id, 0]))
  );
  const [currentRound, setCurrentRound] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_TIME);
  const [answer, setAnswer] = useState('');
  const [answerState, setAnswerState] = useState('idle'); // idle | correct | wrong | locked
  const [gamePhase, setGamePhase] = useState('playing'); // playing | roundResult | gameOver
  const [roundResult, setRoundResult] = useState(null);
  const [showLeave, setShowLeave] = useState(false);
  const [shakeKey, setShakeKey] = useState(0);

  const inputRef = useRef(null);
  const timerRef = useRef(null);

  const currentQuestion = questions[currentRound] || questions[0];
  const isWordDuel = gameType === 'word_duel';

  const endRound = useCallback((winnerId = null, winnerAnswer = null) => {
    clearInterval(timerRef.current);
    const pointsThisRound = {};
    members.forEach(m => { pointsThisRound[m.id] = 0; });

    if (winnerId !== null) {
      pointsThisRound[winnerId] = 1;
      setScores(prev => ({ ...prev, [winnerId]: (prev[winnerId] || 0) + 1 }));
    }

    setRoundResult({
      correctAnswer: currentQuestion.answer,
      explanation: currentQuestion.explanation || null,
      pointsThisRound,
      winnerId,
    });
    setGamePhase('roundResult');

    setTimeout(() => {
      setRoundResult(null);
      if (currentRound + 1 >= totalRounds) {
        setGamePhase('gameOver');
      } else {
        setCurrentRound(r => r + 1);
        setAnswer('');
        setAnswerState('idle');
        setTimeLeft(ROUND_TIME);
        setGamePhase('playing');
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }, 2500);
  }, [currentRound, totalRounds, currentQuestion, members]);

  // Countdown timer
  useEffect(() => {
    if (gamePhase !== 'playing') return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          endRound(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [gamePhase, currentRound]);

  const handleSubmit = useCallback(() => {
    if (answerState === 'locked' || !answer.trim()) return;
    const correct = answer.trim().toLowerCase() === currentQuestion.answer.toLowerCase();
    if (correct) {
      setAnswerState('correct');
      endRound(userId, answer.trim());
    } else {
      setAnswerState('wrong');
      setShakeKey(k => k + 1);
      setTimeout(() => {
        if (isWordDuel) {
          // Word Duel: keep trying
          setAnswer('');
          setAnswerState('idle');
          inputRef.current?.focus();
        } else {
          // Context Guesser: lock after one wrong
          setAnswerState('locked');
        }
      }, 600);
    }
  }, [answer, answerState, currentQuestion, userId, isWordDuel, endRound]);

  // Sort scores
  const sortedScores = members
    .map(m => ({ ...m, score: scores[m.id] || 0 }))
    .sort((a, b) => b.score - a.score);

  const winner = sortedScores[0];
  const isGameOver = gamePhase === 'gameOver';

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
              const isMe = member.id === userId || (userId === 0 && member.username === 'You');
              return (
                <div
                  key={member.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: isMe ? '#1e3a5f' : '#334155',
                    borderRadius: 8, padding: '6px 12px', flexShrink: 0,
                    border: idx === 0 ? '1px solid #d9770640' : '1px solid transparent',
                  }}
                >
                  {idx === 0 && <TrophyOutlined style={{ color: '#d97706', fontSize: 12 }} />}
                  <Avatar size={24} style={{ background: getAvatarColor(member.username), fontSize: 11, fontWeight: 700 }}>
                    {member.username.charAt(0).toUpperCase()}
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
            {/* DEV: skip to game over */}
            <Button
              size="small"
              onClick={() => setGamePhase('gameOver')}
              style={{ background: 'transparent', borderColor: '#475569', color: '#64748b', fontSize: 11 }}
            >
              End
            </Button>
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
        </div>

        {/* Round Result Overlay */}
        {roundResult && (
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
                  <div key={m.id} style={{ textAlign: 'center' }}>
                    <Avatar size={32} style={{ background: getAvatarColor(m.username), fontWeight: 700, fontSize: 13 }}>
                      {m.username.charAt(0).toUpperCase()}
                    </Avatar>
                    <Text style={{
                      display: 'block', fontSize: 16, fontWeight: 700,
                      color: roundResult.pointsThisRound[m.id] > 0 ? '#fbbf24' : '#475569',
                      marginTop: 4,
                    }}>
                      {roundResult.pointsThisRound[m.id] > 0 ? '+1' : '+0'}
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
        {isGameOver && (
          <div style={{
            position: 'fixed', inset: 0, background: '#0f172a',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
          }}>
            <div style={{ textAlign: 'center', maxWidth: 440, width: '100%', padding: '0 24px' }}>
              <div style={{ fontSize: 56, marginBottom: 8 }}>🏆</div>
              <Text style={{ color: '#fbbf24', fontSize: 22, fontWeight: 700, display: 'block' }}>
                {winner.username} Wins!
              </Text>
              <Text style={{ color: '#64748b', fontSize: 14, display: 'block', marginBottom: 28 }}>
                Final Results
              </Text>

              <div style={{
                background: '#1e293b', borderRadius: 16, overflow: 'hidden',
                border: '1px solid #334155', marginBottom: 24,
              }}>
                {sortedScores.map((member, idx) => {
                  const isMe = member.id === userId || (userId === 0 && member.username === 'You');
                  return (
                    <div
                      key={member.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '14px 20px',
                        background: idx === 0 ? '#1c1917' : isMe ? '#1e3a5f20' : 'transparent',
                        borderBottom: idx < sortedScores.length - 1 ? '1px solid #334155' : 'none',
                      }}
                    >
                      <Text style={{ color: idx === 0 ? '#fbbf24' : '#475569', fontWeight: 700, fontSize: 18, width: 28 }}>
                        {idx + 1}
                      </Text>
                      <Avatar size={36} style={{ background: getAvatarColor(member.username), fontSize: 15, fontWeight: 700 }}>
                        {member.username.charAt(0).toUpperCase()}
                      </Avatar>
                      <Text style={{ color: '#e2e8f0', flex: 1, fontSize: 15 }}>
                        {member.username}{isMe ? ' (You)' : ''}
                      </Text>
                      <Text style={{ color: '#fbbf24', fontWeight: 700, fontSize: 20 }}>
                        {member.score}
                      </Text>
                    </div>
                  );
                })}
              </div>

              <Space size={12}>
                {isHost && (
                  <Button
                    size="large"
                    onClick={() => {
                      setScores(Object.fromEntries(members.map(m => [m.id, 0])));
                      setCurrentRound(0);
                      setTimeLeft(ROUND_TIME);
                      setAnswer('');
                      setAnswerState('idle');
                      setGamePhase('playing');
                    }}
                    style={{ borderRadius: 8 }}
                  >
                    Play Again
                  </Button>
                )}
                <Button
                  type="primary"
                  size="large"
                  onClick={() => navigate('/room')}
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
          onOk={() => navigate('/room')}
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
