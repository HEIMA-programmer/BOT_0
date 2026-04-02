import VideoTile from './VideoTile';

export default function VideoGrid({
  members, userId, remoteUsers, remoteMedia,
  micEnabled, cameraEnabled, localMicrophoneTrack, localCameraTrack,
  isHost, onKick,
}) {
  const gridCols = members.length <= 1 ? 1 : 2;
  const tileSize = members.length <= 2 ? 280 : 200;

  return (
    <div style={{
      flex: 1,
      display: 'grid',
      gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
      gap: 8,
      padding: 16,
      alignContent: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    }}>
      {members.map(member => {
        const isMe = member.user_id === userId;
        const rtcUser = isMe ? null : remoteUsers.find(u => Number(u.uid) === member.user_id);
        const wsMedia = remoteMedia[member.user_id];
        // Agora track state is primary; WS state is fallback
        const hasVideo = isMe ? cameraEnabled : (rtcUser ? rtcUser.hasVideo : wsMedia?.camera_on ?? false);
        const hasAudio = isMe ? micEnabled : (rtcUser ? rtcUser.hasAudio : wsMedia?.mic_on ?? false);

        return (
          <VideoTile
            key={member.user_id}
            member={member}
            isMe={isMe}
            isHost={isHost}
            tileSize={tileSize}
            localMicrophoneTrack={localMicrophoneTrack}
            localCameraTrack={localCameraTrack}
            micEnabled={micEnabled}
            cameraEnabled={cameraEnabled}
            rtcUser={rtcUser}
            hasVideo={hasVideo}
            hasAudio={hasAudio}
            onKick={onKick}
          />
        );
      })}
    </div>
  );
}
