import React, { useEffect, useRef, useState } from 'react';
import { Typography } from 'antd';

const { Title, Text } = Typography;

const SCENE_WIDTH = 560;
const SCENE_HEIGHT = 340;

const CHARACTER_CONFIG = [
  {
    id: 'mentor',
    left: 26,
    width: 168,
    height: 248,
    color: '#4f7cff',
    shape: 'rounded-rect',
    layer: 1,
    eyes: 'white',
    eyeLeft: 40,
    eyeTop: 42,
    eyeGap: 34,
    eyeSize: 18,
    pupilSize: 7,
    forceOnFocus: { x: 4, y: 1 },
    typingLean: -7,
    typingShift: 20,
  },
  {
    id: 'ink',
    left: 146,
    width: 98,
    height: 182,
    color: '#132238',
    shape: 'rounded-rect',
    layer: 4,
    eyes: 'white',
    eyeLeft: 24,
    eyeTop: 32,
    eyeGap: 24,
    eyeSize: 15,
    pupilSize: 6,
    forceOnFocus: { x: -2, y: -3 },
  },
  {
    id: 'sun',
    left: 0,
    width: 218,
    height: 148,
    color: '#f2b66d',
    shape: 'arch',
    layer: 5,
    eyes: 'pupil',
    eyeLeft: 76,
    eyeTop: 72,
    eyeGap: 26,
    eyeSize: 12,
    mouth: 'smile',
  },
  {
    id: 'note',
    left: 214,
    width: 124,
    height: 210,
    color: '#6c7ee1',
    shape: 'capsule',
    layer: 3,
    eyes: 'white',
    eyeLeft: 30,
    eyeTop: 34,
    eyeGap: 30,
    eyeSize: 16,
    pupilSize: 6,
    forceOnShowPassword: { x: -4, y: -3 },
  },
  {
    id: 'quiz',
    left: 304,
    width: 136,
    height: 168,
    color: '#57c0ad',
    shape: 'arch',
    layer: 6,
    eyes: 'pupil',
    eyeLeft: 40,
    eyeTop: 44,
    eyeGap: 22,
    eyeSize: 11,
    mouth: 'line',
  },
  {
    id: 'pulse',
    left: 394,
    width: 86,
    height: 224,
    color: '#8d6bff',
    shape: 'rounded-rect',
    layer: 2,
    eyes: 'white',
    eyeLeft: 18,
    eyeTop: 34,
    eyeGap: 20,
    eyeSize: 14,
    pupilSize: 5,
  },
  {
    id: 'glow',
    left: 450,
    width: 92,
    height: 132,
    color: '#96d7ff',
    shape: 'capsule',
    layer: 7,
    eyes: 'pupil',
    eyeLeft: 24,
    eyeTop: 28,
    eyeGap: 16,
    eyeSize: 10,
    mouth: 'smile',
  },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function Eye({ size, pupilSize, maxDistance, eyeColor, pupilColor, isBlinking, forceLook }) {
  const eyeRef = useRef(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event) => {
      setMouse({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const getOffset = () => {
    if (forceLook) {
      return forceLook;
    }
    if (!eyeRef.current) {
      return { x: 0, y: 0 };
    }

    const rect = eyeRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = mouse.x - centerX;
    const deltaY = mouse.y - centerY;
    const distance = Math.min(Math.hypot(deltaX, deltaY), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);

    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };

  const offset = getOffset();

  return (
    <div
      ref={eyeRef}
      style={{
        width: size,
        height: isBlinking ? 3 : size,
        borderRadius: size,
        background: eyeColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        transition: 'height 120ms ease, transform 180ms ease',
      }}
    >
      {!isBlinking && (
        <div
          style={{
            width: pupilSize,
            height: pupilSize,
            borderRadius: pupilSize,
            background: pupilColor,
            transform: `translate(${offset.x}px, ${offset.y}px)`,
            transition: 'transform 100ms ease-out',
          }}
        />
      )}
    </div>
  );
}

function Pupil({ size, maxDistance, color, forceLook, isBlinking }) {
  const pupilRef = useRef(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (event) => {
      setMouse({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const getOffset = () => {
    if (forceLook) {
      return forceLook;
    }
    if (!pupilRef.current) {
      return { x: 0, y: 0 };
    }

    const rect = pupilRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = mouse.x - centerX;
    const deltaY = mouse.y - centerY;
    const distance = Math.min(Math.hypot(deltaX, deltaY), maxDistance);
    const angle = Math.atan2(deltaY, deltaX);

    return {
      x: Math.cos(angle) * distance,
      y: Math.sin(angle) * distance,
    };
  };

  const offset = getOffset();

  return (
    <div
      ref={pupilRef}
      style={{
        width: size,
        height: isBlinking ? 3 : size,
        borderRadius: size,
        background: color,
        transform: isBlinking ? 'none' : `translate(${offset.x}px, ${offset.y}px)`,
        transition: 'transform 100ms ease-out, height 120ms ease',
      }}
    />
  );
}

function Character({
  config,
  pose,
  isBlinking,
  forceLook,
  lift = 0,
  activeLean = 0,
  activeShift = 0,
  characterRef,
  sunglassesOn = false,
}) {
  const borderRadiusMap = {
    'rounded-rect': '18px 18px 0 0',
    arch: `${config.width}px ${config.width}px 0 0`,
    capsule: `${config.width / 2}px ${config.width / 2}px 0 0`,
  };

  const mouthMap = {
    line: {
      width: 34,
      height: 4,
      borderRadius: 999,
      background: 'rgba(17, 24, 39, 0.7)',
    },
    smile: {
      width: 28,
      height: 14,
      borderBottom: '4px solid rgba(17, 24, 39, 0.7)',
      borderRadius: '0 0 18px 18px',
      background: 'transparent',
    },
  };
  const glassesWidth = config.eyeGap + config.eyeSize * 2 + 24;
  const glassesHeight = Math.max(18, config.eyeSize + 8);
  const glassesLeft = config.eyeLeft + pose.faceX - 10;
  const glassesTop = config.eyeTop + pose.faceY - 3;

  return (
    <div
      ref={characterRef}
      style={{
        position: 'absolute',
        left: config.left,
        bottom: 0,
        width: config.width,
        height: config.height + lift,
        background: config.color,
        borderRadius: borderRadiusMap[config.shape],
        transform: `skewX(${pose.bodySkew + activeLean}deg) translateX(${activeShift}px)`,
        transformOrigin: 'bottom center',
        boxShadow: '0 16px 40px rgba(15, 23, 42, 0.14)',
        transition: 'transform 550ms ease, height 550ms ease',
        zIndex: config.layer,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: config.eyeLeft + pose.faceX,
          top: config.eyeTop + pose.faceY,
          display: 'flex',
          gap: config.eyeGap,
          transition: 'left 240ms ease, top 240ms ease',
        }}
      >
        {config.eyes === 'white' ? (
          <>
            <Eye
              size={config.eyeSize}
              pupilSize={config.pupilSize}
              maxDistance={5}
              eyeColor="#ffffff"
              pupilColor="#16213e"
              isBlinking={isBlinking}
              forceLook={forceLook}
            />
            <Eye
              size={config.eyeSize}
              pupilSize={config.pupilSize}
              maxDistance={5}
              eyeColor="#ffffff"
              pupilColor="#16213e"
              isBlinking={isBlinking}
              forceLook={forceLook}
            />
          </>
        ) : (
          <>
            <Pupil size={config.eyeSize} maxDistance={5} color="#16213e" forceLook={forceLook} isBlinking={isBlinking} />
            <Pupil size={config.eyeSize} maxDistance={5} color="#16213e" forceLook={forceLook} isBlinking={isBlinking} />
          </>
        )}
      </div>

      <div
        style={{
          position: 'absolute',
          left: glassesLeft,
          top: glassesTop,
          width: glassesWidth,
          height: glassesHeight,
          opacity: sunglassesOn ? 1 : 0,
          transform: sunglassesOn ? 'translateY(0) scale(1)' : 'translateY(-16px) scale(0.82)',
          transition: 'opacity 220ms ease, transform 280ms ease',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: glassesWidth / 2 - 12,
            top: glassesHeight / 2 - 2,
            width: 24,
            height: 4,
            borderRadius: 999,
            background: 'rgba(15,23,42,0.92)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: (glassesWidth - 16) / 2,
            height: glassesHeight,
            borderRadius: 999,
            background: 'linear-gradient(180deg, rgba(15,23,42,0.96), rgba(30,41,59,0.9))',
            border: '2px solid rgba(255,255,255,0.16)',
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.08)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 0,
            top: 0,
            width: (glassesWidth - 16) / 2,
            height: glassesHeight,
            borderRadius: 999,
            background: 'linear-gradient(180deg, rgba(15,23,42,0.96), rgba(30,41,59,0.9))',
            border: '2px solid rgba(255,255,255,0.16)',
            boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.08)',
          }}
        />
      </div>

      {config.mouth && (
        <div
          style={{
            position: 'absolute',
            left: config.eyeLeft + pose.faceX + 8,
            top: config.eyeTop + pose.faceY + 38,
            ...mouthMap[config.mouth],
          }}
        />
      )}
    </div>
  );
}

export default function AuthMascotPanel({
  heading,
  description,
  stats,
  emailFocused,
  passwordActive,
  stackedLayout,
}) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [blinkMap, setBlinkMap] = useState(() => (
    Object.fromEntries(CHARACTER_CONFIG.map((character) => [character.id, false]))
  ));
  const refs = useRef({});

  useEffect(() => {
    const handleMouseMove = (event) => {
      setMouse({ x: event.clientX, y: event.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const timeouts = [];

    const scheduleBlink = (characterId) => {
      const delay = 2400 + Math.random() * 3200;
      const timeoutId = window.setTimeout(() => {
        setBlinkMap((prev) => ({ ...prev, [characterId]: true }));

        const closeId = window.setTimeout(() => {
          setBlinkMap((prev) => ({ ...prev, [characterId]: false }));
          scheduleBlink(characterId);
        }, 140);

        timeouts.push(closeId);
      }, delay);

      timeouts.push(timeoutId);
    };

    CHARACTER_CONFIG.forEach((character) => scheduleBlink(character.id));

    return () => {
      timeouts.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, []);

  const calculatePose = (characterId) => {
    const element = refs.current[characterId];
    if (!element) {
      return { faceX: 0, faceY: 0, bodySkew: 0 };
    }

    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 3;
    const deltaX = mouse.x - centerX;
    const deltaY = mouse.y - centerY;

    return {
      faceX: clamp(deltaX / 20, -12, 12),
      faceY: clamp(deltaY / 28, -8, 8),
      bodySkew: clamp(-deltaX / 120, -5, 5),
    };
  };

  const sceneScale = stackedLayout ? 0.82 : 1;

  return (
    <div
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: stackedLayout ? '48px 28px 24px' : '60px 72px',
        color: '#fff',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 18% 20%, rgba(96,165,250,0.22), transparent 28%), radial-gradient(circle at 78% 26%, rgba(167,139,250,0.18), transparent 30%), radial-gradient(circle at 52% 82%, rgba(110,231,183,0.14), transparent 28%)',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 520 }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
            borderRadius: 16,
            width: 56,
            height: 56,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            fontWeight: 700,
            marginBottom: 28,
            boxShadow: '0 12px 32px rgba(96,165,250,0.28)',
          }}
        >
          A
        </div>
        <Title level={1} style={{ color: '#fff', fontSize: stackedLayout ? 34 : 40, fontWeight: 700, marginBottom: 16, lineHeight: 1.15 }}>
          {heading}
        </Title>
        <Text style={{ color: 'rgba(255,255,255,0.74)', fontSize: 17, lineHeight: 1.7, maxWidth: 460 }}>
          {description}
        </Text>

        <div style={{ marginTop: 34, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {stats.map((item) => (
            <div
              key={item.label}
              style={{
                minWidth: 132,
                padding: '14px 16px',
                borderRadius: 16,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.1)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ fontSize: 26, fontWeight: 700, color: '#93c5fd' }}>{item.num}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>{item.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          marginTop: stackedLayout ? 28 : 44,
          height: stackedLayout ? 300 : 360,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: SCENE_WIDTH,
            height: SCENE_HEIGHT,
            position: 'relative',
            transform: `scale(${sceneScale})`,
            transformOrigin: 'center bottom',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 'auto 20px 8px',
              height: 44,
              borderRadius: 999,
              background: 'radial-gradient(circle, rgba(15,23,42,0.26), rgba(15,23,42,0))',
              filter: 'blur(8px)',
            }}
          />
          {CHARACTER_CONFIG.map((character) => {
            const isBlinking = blinkMap[character.id];
            const forceLook = passwordActive
              ? undefined
              : emailFocused && character.forceOnFocus
                ? character.forceOnFocus
                : undefined;

            return (
              <Character
                key={character.id}
                characterRef={(node) => { refs.current[character.id] = node; }}
                config={character}
                pose={calculatePose(character.id)}
                isBlinking={isBlinking}
                forceLook={forceLook}
                lift={emailFocused && character.id === 'mentor' ? 18 : 0}
                activeLean={emailFocused ? (character.typingLean || 0) : 0}
                activeShift={emailFocused ? (character.typingShift || 0) : 0}
                sunglassesOn={passwordActive}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
