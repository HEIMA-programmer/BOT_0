import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { roomAPI } from '../api/index';

/**
 * Manages Socket.IO connection and room state (members, topic, remote media).
 * @param {number} roomId
 * @param {number} userId
 * @param {object} options
 * @param {object|null} options.initialRoom - Room object from navigation state
 * @param {Array|null} options.initialMembers - Members from navigation state
 * @param {Function} options.onKicked - Called when this user is kicked
 */
export default function useRoomSocket(roomId, userId, { initialRoom, initialMembers, onKicked }) {
  const [room] = useState(initialRoom || null);
  const [members, setMembers] = useState(initialMembers || []);
  const [topic, setTopic] = useState(initialRoom?.topic || 'Free Talk');
  const [remoteMedia, setRemoteMedia] = useState({});

  const socketRef = useRef(null);
  const isLeavingRef = useRef(false);

  // Load real members on mount
  useEffect(() => {
    if (!roomId) return;
    roomAPI.getRoom(roomId)
      .then(res => setMembers(res.data.members || []))
      .catch(() => onKicked?.());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Socket connection
  useEffect(() => {
    if (!roomId || !userId) return;
    const socket = io('/room', { withCredentials: true });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_waiting_room', { room_id: roomId });
    });

    socket.on('member_joined', ({ member }) => {
      if (isLeavingRef.current) return;
      setMembers(prev => prev.find(m => m.user_id === member.user_id) ? prev : [...prev, member]);
    });

    socket.on('member_left', ({ user_id }) => {
      if (isLeavingRef.current) return;
      setMembers(prev => prev.filter(m => m.user_id !== user_id));
    });

    socket.on('host_changed', ({ new_host_user_id }) => {
      if (isLeavingRef.current) return;
      setMembers(prev =>
        prev.map(m => ({
          ...m,
          role: m.user_id === new_host_user_id ? 'host' : m.role === 'host' ? 'member' : m.role,
        }))
      );
    });

    socket.on('topic_changed', ({ topic: newTopic }) => {
      if (!isLeavingRef.current) setTopic(newTopic);
    });

    socket.on('member_kicked', ({ user_id: kickedId }) => {
      if (kickedId === userId) {
        isLeavingRef.current = true;
        onKicked?.();
      }
    });

    socket.on('media_state_changed', ({ user_id: uid, mic_on, camera_on }) => {
      if (isLeavingRef.current) return;
      setRemoteMedia(prev => ({ ...prev, [uid]: { mic_on, camera_on } }));
    });

    return () => socket.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, userId]);

  const changeTopic = useCallback((newTopic) => {
    setTopic(newTopic);
    socketRef.current?.emit('set_topic', { room_id: roomId, topic: newTopic });
  }, [roomId]);

  const emitMediaState = useCallback((micOn, cameraOn) => {
    socketRef.current?.emit('toggle_media', { room_id: roomId, mic_on: micOn, camera_on: cameraOn });
  }, [roomId]);

  const kickMember = useCallback((targetUserId) => {
    socketRef.current?.emit('kick_member', { room_id: roomId, target_user_id: targetUserId });
  }, [roomId]);

  const markLeaving = useCallback(() => {
    isLeavingRef.current = true;
  }, []);

  return {
    room,
    members,
    topic,
    remoteMedia,
    isLeavingRef,
    changeTopic,
    emitMediaState,
    kickMember,
    markLeaving,
  };
}
