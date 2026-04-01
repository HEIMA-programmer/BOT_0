import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import { roomAPI } from '../../../api/index';
import useRoomSocket from '../../../hooks/useRoomSocket';
import useAgoraMedia from '../../../hooks/useAgoraMedia';
import useRoomTimer from '../../../hooks/useRoomTimer';

import TopBar from './TopBar';
import TopicBanner from './TopicBanner';
import ErrorBanners from './ErrorBanners';
import VideoGrid from './VideoGrid';
import BottomControls from './BottomControls';
import TopicModal from './TopicModal';
import LeaveModal from './LeaveModal';

export default function SpeakingRoomInner({ user, roomId, initialRoom, initialMembers, agoraAppId, agoraToken, channel }) {
  const navigate = useNavigate();
  const userId = user?.id || 0;

  const { elapsed, formatElapsed } = useRoomTimer();

  const {
    room, members, topic, remoteMedia, isLeavingRef,
    changeTopic, emitMediaState, kickMember, markLeaving,
  } = useRoomSocket(roomId, userId, {
    initialRoom,
    initialMembers,
    onKicked: () => navigate('/room'),
  });

  const isHost = members.find(m => m.user_id === userId)?.role === 'host';

  const onMediaChange = useCallback((micOn, cameraOn) => {
    emitMediaState(micOn, cameraOn);
  }, [emitMediaState]);

  const {
    micEnabled, setMicEnabled, cameraEnabled, setCameraEnabled,
    joinError, localMicrophoneTrack, localCameraTrack,
    remoteUsers, permissionWarning,
  } = useAgoraMedia({ appId: agoraAppId, token: agoraToken, channel, uid: userId, onMediaChange });

  const [showLeave, setShowLeave] = useState(false);
  const [showTopicModal, setShowTopicModal] = useState(false);

  // Browser back-button: call REST leave
  useEffect(() => {
    if (!roomId) return;
    const onPop = () => {
      if (!isLeavingRef.current) {
        roomAPI.leave(roomId).catch(() => {});
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [roomId, isLeavingRef]);

  const handleLeave = useCallback(async () => {
    if (isHost && members.length > 1) {
      setShowLeave(true);
    } else {
      markLeaving();
      try { await roomAPI.leave(roomId, { summary: `Topic: ${topic}` }); } catch {}
      navigate('/room');
    }
  }, [isHost, members.length, roomId, navigate, topic, markLeaving]);

  const confirmLeave = useCallback(async () => {
    markLeaving();
    setShowLeave(false);
    try { await roomAPI.leave(roomId, { summary: `Topic: ${topic}` }); } catch {}
    navigate('/room');
  }, [roomId, navigate, topic, markLeaving]);

  const handleChangeTopic = useCallback((newTopic) => {
    changeTopic(newTopic);
    setShowTopicModal(false);
  }, [changeTopic]);

  return (
    <div style={{ height: '100vh', background: '#0f172a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <TopBar room={room} elapsed={elapsed} formatElapsed={formatElapsed} memberCount={members.length} />
      <TopicBanner topic={topic} isHost={isHost} onChangeTopic={() => setShowTopicModal(true)} />
      <ErrorBanners joinError={joinError} permissionWarning={permissionWarning} />

      <VideoGrid
        members={members}
        userId={userId}
        remoteUsers={remoteUsers}
        remoteMedia={remoteMedia}
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        localMicrophoneTrack={localMicrophoneTrack}
        localCameraTrack={localCameraTrack}
        isHost={isHost}
        onKick={kickMember}
      />

      <BottomControls
        micEnabled={micEnabled}
        cameraEnabled={cameraEnabled}
        onToggleMic={() => setMicEnabled(v => !v)}
        onToggleCamera={() => setCameraEnabled(v => !v)}
        onLeave={handleLeave}
      />

      <TopicModal
        open={showTopicModal}
        topic={topic}
        onSelect={handleChangeTopic}
        onCancel={() => setShowTopicModal(false)}
      />

      <LeaveModal
        open={showLeave}
        isHost={isHost}
        onConfirm={confirmLeave}
        onCancel={() => setShowLeave(false)}
      />
    </div>
  );
}
