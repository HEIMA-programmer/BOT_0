import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Typography, Spin } from 'antd';
import AgoraRTC, { AgoraRTCProvider } from 'agora-rtc-react';

import { roomAPI } from '../../api/index';
import SpeakingRoomInner from './speaking/SpeakingRoomInner';

const { Text } = Typography;

export default function SpeakingRoomWrapper({ user }) {
  // Create a fresh client per mount so StrictMode's unmount→remount gets a clean state.
  const [client] = useState(() => AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' }));
  const location = useLocation();
  const { id: roomIdParam } = useParams();
  const roomId = location.state?.room?.id ? Number(location.state.room.id) : Number(roomIdParam);

  const [agoraToken, setAgoraToken] = useState(null);
  const [agoraAppId, setAgoraAppId] = useState(null);
  const [channel, setChannel] = useState(null);
  const [fetchError, setFetchError] = useState('');

  useEffect(() => {
    if (!roomId) return;
    roomAPI.getAgoraToken(roomId)
      .then(res => {
        setAgoraToken(res.data.token);
        setAgoraAppId(res.data.app_id);
        setChannel(res.data.channel);
      })
      .catch(err => setFetchError(err.response?.data?.error || 'Failed to connect to media server'));
  }, [roomId]);

  if (fetchError) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <Text style={{ color: '#ef4444' }}>{fetchError}</Text>
      </div>
    );
  }

  if (!agoraToken) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <AgoraRTCProvider client={client}>
      <SpeakingRoomInner
        user={user}
        roomId={roomId}
        initialRoom={location.state?.room}
        initialMembers={location.state?.members}
        agoraAppId={agoraAppId}
        agoraToken={agoraToken}
        channel={channel}
      />
    </AgoraRTCProvider>
  );
}
