import { useState, useEffect, useCallback } from 'react';
import YouTube from 'react-youtube';
import { io } from 'socket.io-client';
import './App.css';

const socket = io(window.location.hostname === 'localhost' ? 'http://localhost:3000' : window.location.origin);

function App() {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [player, setPlayer] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    // Generate or get room ID from URL
    const urlRoomId = new URLSearchParams(window.location.search).get('room');
    const newRoomId = urlRoomId || Math.random().toString(36).substring(7);
    setRoomId(newRoomId);

    if (!urlRoomId) {
      window.history.pushState({}, '', `?room=${newRoomId}`);
    }

    // Join room
    socket.emit('join-room', newRoomId);

    // Listen for video state updates
    socket.on('video-state', ({ videoId, playerState, currentTime }) => {
      if (player && !isSyncing) {
        setIsSyncing(true);
        setVideoId(videoId);
        
        if (playerState === YouTube.PlayerState.PLAYING) {
          player.seekTo(currentTime);
          player.playVideo();
        } else if (playerState === YouTube.PlayerState.PAUSED) {
          player.seekTo(currentTime);
          player.pauseVideo();
        }
        setIsSyncing(false);
      }
    });

    return () => {
      socket.off('video-state');
    };
  }, [player, isSyncing]);

  const handleVideoUrlChange = (e) => {
    const url = e.target.value;
    setVideoUrl(url);
    
    // Extract video ID from URL
    const videoIdMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
    if (videoIdMatch) {
      const newVideoId = videoIdMatch[1];
      setVideoId(newVideoId);
      socket.emit('video-state-change', {
        roomId,
        videoId: newVideoId,
        playerState: YouTube.PlayerState.PLAYING,
        currentTime: 0
      });
    }
  };

  const onPlayerReady = (event) => {
    setPlayer(event.target);
  };

  const onPlayerStateChange = useCallback((event) => {
    if (!isSyncing) {
      socket.emit('video-state-change', {
        roomId,
        videoId,
        playerState: event.data,
        currentTime: event.target.getCurrentTime()
      });
    }
  }, [roomId, videoId, isSyncing]);

  const copyRoomLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    alert('Room link copied to clipboard!');
  };

  const opts = {
    height: '500',
    width: '100%',
    playerVars: {
      autoplay: 1,
      origin: window.location.origin
    },
  };

  return (
    <div className="app-container">
      <h1>Synchronized YouTube Player</h1>
      <div className="input-container">
        <input
          type="text"
          value={videoUrl}
          onChange={handleVideoUrlChange}
          placeholder="Paste YouTube URL here"
          className="url-input"
        />
        <button onClick={copyRoomLink} className="share-button">
          Share Room
        </button>
      </div>
      {videoId && (
        <div className="video-container">
          <YouTube
            videoId={videoId}
            opts={opts}
            onReady={onPlayerReady}
            onStateChange={onPlayerStateChange}
          />
        </div>
      )}
    </div>
  );
}

export default App;