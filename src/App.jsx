import React, { useState, useEffect, useRef } from 'react';
import { Play, Search, Globe, Tv, Loader, ArrowLeft, List } from 'lucide-react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import channelsData from './channels.json';

const App = () => {
  const [countries, setCountries] = useState([]);
  const [filteredCountries, setFilteredCountries] = useState([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistChannels, setPlaylistChannels] = useState([]);
  const [filteredPlaylistChannels, setFilteredPlaylistChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [playlistSearchTerm, setPlaylistSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [playlistLoading, setPlaylistLoading] = useState(false);
  const [error, setError] = useState(null);
  const [command, setCommand] = useState('');
  const [currentChannelIndex, setCurrentChannelIndex] = useState(-1);
  const [isStreamLoading, setIsStreamLoading] = useState(false);
  const [view, setView] = useState('countries'); // 'countries', 'playlist', 'player'

  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      try {
        setCountries(channelsData);
        setFilteredCountries(channelsData);
      } catch (err) {
        setError('Failed to load channel data.');
        console.error('Error loading channels:', err);
      } finally {
        setLoading(false);
      }
    }, 500);
  }, []);

  // Filter countries based on search
  useEffect(() => {
    if (searchTerm && view === 'countries') {
      const lowercasedSearchTerm = searchTerm.toLowerCase();
      const filtered = channelsData.map(country => {
        const filteredChannels = country.channels.filter(channel =>
          channel.name.toLowerCase().includes(lowercasedSearchTerm) ||
          country.country.toLowerCase().includes(lowercasedSearchTerm) ||
          channel.category.toLowerCase().includes(lowercasedSearchTerm)
        );
        return filteredChannels.length > 0 ? { ...country, channels: filteredChannels } : null;
      }).filter(Boolean);
      setFilteredCountries(filtered);
    } else if (view === 'countries') {
      setFilteredCountries(channelsData);
    }
  }, [searchTerm, view]);

  // Filter playlist channels based on search
  useEffect(() => {
    if (playlistSearchTerm && view === 'playlist') {
      const lowercasedSearchTerm = playlistSearchTerm.toLowerCase();
      const filtered = playlistChannels.filter(channel =>
        channel.name.toLowerCase().includes(lowercasedSearchTerm) ||
        channel.category.toLowerCase().includes(lowercasedSearchTerm)
      );
      setFilteredPlaylistChannels(filtered);
    } else if (view === 'playlist') {
      setFilteredPlaylistChannels(playlistChannels);
    }
  }, [playlistSearchTerm, playlistChannels, view]);

  // Video.js player setup
  useEffect(() => {
    const videoElement = videoRef.current;

    if (videoElement && selectedChannel && view === 'player') {
      setIsStreamLoading(true);
      
      // Dispose of existing player
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }

      // Create new player
      const options = {
        autoplay: 'muted',
        controls: true,
        responsive: true,
        fluid: true,
        playbackRates: [0.5, 1, 1.5, 2],
        sources: [{
          src: selectedChannel.url,
          type: 'application/x-mpegURL'
        }],
        html5: {
          hls: {
            enableLowInitialPlaylist: true,
            smoothQualityChange: true,
            overrideNative: true
          }
        }
      };

      const player = videojs(videoElement, options, () => {
        console.log('Player is ready');
        setIsStreamLoading(false);
      });

      player.on('loadstart', () => {
        setIsStreamLoading(true);
      });

      player.on('canplay', () => {
        setIsStreamLoading(false);
      });

      player.on('error', (e) => {
        console.error('Video.js error:', e);
        setIsStreamLoading(false);
      });

      playerRef.current = player;
    }

    return () => {
      if (playerRef.current) {
        try {
          playerRef.current.dispose();
        } catch (e) {
          console.error('Error disposing player:', e);
        }
        playerRef.current = null;
      }
    };
  }, [selectedChannel, view]);

  const parseM3U = (m3uText) => {
    const lines = m3uText.split('\n');
    const channels = [];
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].startsWith('#EXTINF:')) {
        const infoLine = lines[i];
        const urlLine = lines[i + 1];
        
        if (urlLine && urlLine.trim() && !urlLine.startsWith('#')) {
          // Extract channel info from the EXTINF line
          const nameMatch = infoLine.match(/,(.*)$/);
          const name = nameMatch ? nameMatch[1].trim() : 'Unknown Channel';
          
          // Extract additional metadata
          const tvgLogoMatch = infoLine.match(/tvg-logo="([^"]*)"/);
          const groupTitleMatch = infoLine.match(/group-title="([^"]*)"/);
          
          channels.push({
            id: channels.length + 1,
            name,
            url: urlLine.trim(),
            logo: tvgLogoMatch ? tvgLogoMatch[1] : null,
            category: groupTitleMatch ? groupTitleMatch[1] : 'Uncategorized',
          });
        }
        i++; // Skip the URL line in next iteration
      }
    }
    
    return channels;
  };

  const handlePlaylistSelect = async (playlist) => {
    setSelectedPlaylist(playlist);
    setPlaylistLoading(true);
    setView('playlist');
    
    try {
      const response = await fetch(playlist.url);
      const m3uText = await response.text();
      const channels = parseM3U(m3uText);
      setPlaylistChannels(channels);
      setFilteredPlaylistChannels(channels);
    } catch (err) {
      console.error('Error fetching playlist:', err);
      setError('Failed to load playlist channels.');
    } finally {
      setPlaylistLoading(false);
    }
  };

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel);
    setView('player');
    const index = filteredPlaylistChannels.findIndex(c => c.url === channel.url);
    setCurrentChannelIndex(index);
  };

  const closePlayer = () => {
    if (playerRef.current) {
      try {
        playerRef.current.dispose();
      } catch (e) {
        console.error('Error disposing player on close:', e);
      }
      playerRef.current = null;
    }
    setSelectedChannel(null);
    setCurrentChannelIndex(-1);
    setView('playlist');
  };

  const goBackToCountries = () => {
    setView('countries');
    setSelectedPlaylist(null);
    setPlaylistChannels([]);
    setFilteredPlaylistChannels([]);
    setPlaylistSearchTerm('');
  };

  const goBackToPlaylist = () => {
    closePlayer();
  };

  const handleCommand = (e) => {
    if (e.key === 'Enter') {
      const cmd = command.trim().toLowerCase();
      setCommand(''); 

      const totalChannels = filteredPlaylistChannels.length;

      switch (cmd) {
        case 'next': {
          if (totalChannels > 0) {
            const nextIndex = (currentChannelIndex + 1) % totalChannels;
            handleChannelSelect(filteredPlaylistChannels[nextIndex]);
          }
          break;
        }
        case 'prev':
        case 'previous': {
          if (totalChannels > 0) {
            const prevIndex = (currentChannelIndex - 1 + totalChannels) % totalChannels;
            handleChannelSelect(filteredPlaylistChannels[prevIndex]);
          }
          break;
        }
        case 'play':
          if (playerRef.current) {
            playerRef.current.play().catch(e => console.error('Play error:', e));
          }
          break;
        case 'pause':
          if (playerRef.current) {
            playerRef.current.pause();
          }
          break;
        case 'stop':
          closePlayer();
          break;
        case 'back':
          goBackToPlaylist();
          break;
        default:
          const channelIndex = parseInt(cmd, 10);
          if (!isNaN(channelIndex) && channelIndex > 0 && channelIndex <= totalChannels) {
            handleChannelSelect(filteredPlaylistChannels[channelIndex - 1]);
          }
          break;
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading channels...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 text-lg mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Countries View
  if (view === 'countries') {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="bg-gray-800 shadow-lg sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-3">
                <Tv className="w-8 h-8 text-blue-400" />
                <h1 className="text-2xl font-bold">NexGen IPTV</h1>
              </div>
              <div className="text-sm text-gray-400">
                {filteredCountries.flatMap(c => c.channels).length} playlists available
              </div>
            </div>
            <div className="mt-4 relative max-w-md">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search playlists..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {filteredCountries.map((country, countryIndex) => (
            <div key={countryIndex} className="mb-8">
              <div className="flex items-center space-x-2 mb-4">
                <img 
                  src={country.flag} 
                  alt={`${country.country} flag`} 
                  className="w-8 h-6 rounded-sm border border-gray-600 shadow"
                  onError={(e) => e.target.style.display = 'none'}
                />
                <h2 className="text-2xl font-semibold">{country.country}</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {country.channels.map((playlist, playlistIndex) => (
                  <div
                    key={`${countryIndex}-${playlistIndex}`}
                    className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 group"
                    onClick={() => handlePlaylistSelect(playlist)}
                  >
                    <div className="relative aspect-video bg-gray-700 flex items-center justify-center">
                      <List className="w-12 h-12 text-gray-500" />
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-12 h-12 text-white" />
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-sm mb-2 truncate" title={playlist.name}>
                        {playlist.name}
                      </h3>
                      <div className="text-xs text-gray-400">
                        <span className="bg-gray-700 px-2 py-1 rounded">
                          {playlist.category}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </main>
      </div>
    );
  }

  // Playlist View
  if (view === 'playlist') {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="bg-gray-800 shadow-lg sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center space-x-3">
                <button
                  onClick={goBackToCountries}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <Tv className="w-8 h-8 text-blue-400" />
                <h1 className="text-2xl font-bold">{selectedPlaylist?.name}</h1>
              </div>
              <div className="text-sm text-gray-400">
                {filteredPlaylistChannels.length} channels available
              </div>
            </div>
            <div className="mt-4 relative max-w-md">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search channels..."
                value={playlistSearchTerm}
                onChange={(e) => setPlaylistSearchTerm(e.target.value)}
                className="w-full bg-gray-700 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none transition-colors"
              />
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-8">
          {playlistLoading ? (
            <div className="text-center py-12">
              <Loader className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-lg">Loading playlist channels...</p>
            </div>
          ) : filteredPlaylistChannels.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {filteredPlaylistChannels.map((channel, index) => (
                <div
                  key={index}
                  className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105 group"
                  onClick={() => handleChannelSelect(channel)}
                >
                  <div className="relative aspect-video">
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt={`${channel.name} logo`}
                        className="w-full h-full object-contain bg-gray-700"
                        onError={(e) => { 
                          e.target.style.display = 'none'; 
                          e.target.nextElementSibling.style.display = 'flex'; 
                        }}
                      />
                    ) : null}
                    <div className="w-full h-full bg-gray-700 items-center justify-center" style={{display: channel.logo ? 'none' : 'flex'}}>
                      <Tv className="w-12 h-12 text-gray-500" />
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-sm mb-2 truncate" title={channel.name}>
                      {channel.name}
                    </h3>
                    <div className="text-xs text-gray-400">
                      <span className="bg-gray-700 px-2 py-1 rounded">
                        {channel.category}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Tv className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No channels found in this playlist.</p>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Player View
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="fixed inset-0 bg-black flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <button
                onClick={goBackToPlaylist}
                className="text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-semibold truncate">{selectedChannel?.name}</h2>
            </div>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto relative">
            {isStreamLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-75 z-10">
                <div className="text-center">
                  <Loader className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-2" />
                  <p className="text-white">Loading stream...</p>
                </div>
              </div>
            )}
            <div data-vjs-player className="relative">
              <video
                ref={videoRef}
                className="video-js vjs-default-skin w-full h-64 md:h-96"
                playsInline
                data-setup="{}"
              />
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-gray-400 flex-wrap gap-2">
              <div className="bg-gray-700 px-2 py-1 rounded text-xs">
                {selectedChannel?.category}
              </div>
              <div className="text-xs">
                Channel {currentChannelIndex + 1} of {filteredPlaylistChannels.length}
              </div>
            </div>
          </div>
          
          <div className="p-4 border-t border-gray-700">
            <div className="relative">
              <input
                type="text"
                placeholder="Enter command (next, prev, play, pause, stop, back, or channel number)"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                onKeyDown={handleCommand}
                className="w-full bg-gray-700 text-white pl-4 pr-4 py-2 rounded-lg border border-gray-600 focus:border-blue-400 focus:outline-none transition-colors"
              />
            </div>
            <div className="mt-2 text-xs text-gray-400">
              Commands: next, prev, play, pause, stop, back, or enter a channel number (1-{filteredPlaylistChannels.length})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;