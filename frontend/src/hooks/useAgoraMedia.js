import { useState, useEffect } from 'react';
import {
  useLocalMicrophoneTrack,
  useLocalCameraTrack,
  usePublish,
  useJoin,
  useRemoteUsers,
} from 'agora-rtc-react';

/**
 * Manages Agora RTC join, local tracks, publishing, and remote users.
 * @param {object} params
 * @param {string} params.appId - Agora App ID
 * @param {string} params.token - Agora RTC token
 * @param {string} params.channel - Channel name
 * @param {number} params.uid - User ID
 * @param {Function} params.onMediaChange - Called with (micOn, cameraOn) when toggled
 */
export default function useAgoraMedia({ appId, token, channel, uid, onMediaChange }) {
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [permissionWarning, setPermissionWarning] = useState('');

  // Join the Agora channel
  const { isConnected, error: joinError } = useJoin({
    appid: appId,
    channel,
    token,
    uid,
  }, true);

  // Always create local tracks (ready=true) so they stay alive across mute toggles
  const { localMicrophoneTrack, ready: micReady } = useLocalMicrophoneTrack(true);
  const { localCameraTrack, ready: camReady } = useLocalCameraTrack(true);

  // Only publish after the channel is joined AND tracks are created
  usePublish([localMicrophoneTrack, localCameraTrack], isConnected && micReady && camReady);

  // Detect camera/mic permission denial — warn user after 5s if tracks failed to create.
  // Check both `ready` flag AND actual track objects (track can exist before ready flips).
  /* eslint-disable react-hooks/set-state-in-effect -- clearing warning on permission readiness */
  useEffect(() => {
    const timer = setTimeout(() => {
      const issues = [];
      if (!micReady && !localMicrophoneTrack) issues.push('microphone');
      if (!camReady && !localCameraTrack) issues.push('camera');
      if (issues.length > 0) {
        setPermissionWarning(`Cannot access ${issues.join(' and ')}. Please allow access in your browser settings.`);
      }
    }, 5000);
    if ((micReady || localMicrophoneTrack) && (camReady || localCameraTrack)) {
      setPermissionWarning('');
      clearTimeout(timer);
    }
    return () => clearTimeout(timer);
  }, [micReady, camReady, localMicrophoneTrack, localCameraTrack]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const remoteUsers = useRemoteUsers();

  // Mute/unmute local tracks — separate effects to avoid cross-triggering
  useEffect(() => {
    if (localMicrophoneTrack) localMicrophoneTrack.setEnabled(micEnabled);
  }, [micEnabled, localMicrophoneTrack]);

  useEffect(() => {
    if (localCameraTrack) localCameraTrack.setEnabled(cameraEnabled);
  }, [cameraEnabled, localCameraTrack]);

  // Single broadcast for media state changes
  useEffect(() => {
    onMediaChange?.(micEnabled, cameraEnabled);
  }, [micEnabled, cameraEnabled, onMediaChange]);

  return {
    micEnabled,
    setMicEnabled,
    cameraEnabled,
    setCameraEnabled,
    isConnected,
    joinError,
    localMicrophoneTrack,
    localCameraTrack,
    micReady,
    camReady,
    remoteUsers,
    permissionWarning,
  };
}
