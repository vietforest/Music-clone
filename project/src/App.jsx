import { useState, useEffect, useRef } from "react";
import useSpotifyAuth from "./hooks/useSpotifyAuth";
import useSpotifyPlayer from "./hooks/useSpotifyPlayer";
import Login from "./components/Login";
import Profile from "./components/Profile";
import SearchResults from "./components/SearchResults";
import Player from "./components/Player";
import Playlist from "./components/Playlist";
import HomeView from "./components/HomeView";

import './App.css';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/js/bootstrap.js';

export default function App() {
    const { loading, token, user, login, refresh, logout, searchSpotify, getUserPlaylists, getPlaylistTracks, createPlaylist, deletePlaylist, addTracksToPlaylist, removeTracksFromPlaylist, getAlbumTracks, getRecentlyPlayed, getFeaturedPlaylists, getNewReleases } = useSpotifyAuth();
    const { track, paused, play: playTrack, togglePlay, nextTrack, previousTrack, isReady, changeVolume, volume, position, duration, seek, repeatMode, toggleRepeat } = useSpotifyPlayer(token?.access_token);
    
    // All state hooks must be at the top
    const [searchResults, setSearchResults] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [currentTracks, setCurrentTracks] = useState([]);
    const [currentPlaylistId, setCurrentPlaylistId] = useState(null); // Track which playlist is being viewed
    const [homeView, setHomeView] = useState(true); // true: show home view, false: show playlists
    const [featuredPlaylists, setFeaturedPlaylists] = useState([]);
    const [newReleases, setNewReleases] = useState([]);
    const [recentAlbums, setRecentAlbums] = useState([]);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [pendingTrackUri, setPendingTrackUri] = useState(null);
    const [playingContext, setPlayingContext] = useState(null); // { tracks: [], currentIndex: 0 }
    
    // Cache to prevent reloading home content
    const homeContentLoaded = useRef(false);
    
    // Wrapper function to handle playing tracks with context
    const handlePlayTrack = (trackUri, trackIndex = null, allTracks = null) => {
        if (allTracks && Array.isArray(allTracks) && allTracks.length > 0) {
            // Play from playlist/album context
            const uris = allTracks.map(t => t.uri).filter(Boolean);
            const index = trackIndex !== null ? trackIndex : uris.findIndex(uri => uri === trackUri);
            if (index >= 0) {
                setPlayingContext({ tracks: allTracks, currentIndex: index });
                playTrack(trackUri, uris, index);
            } else {
                // Fallback to single track
                playTrack(trackUri);
            }
        } else {
            // Single track play (from search results)
            setPlayingContext(null);
            playTrack(trackUri);
        }
    };

    // -----------------------
    // Load user playlists
    // -----------------------
    useEffect(() => {
        if (!token?.access_token) return;
        async function loadPlaylists() {
            const pls = await getUserPlaylists();
            setPlaylists(pls);
        }
        loadPlaylists();
    }, [token?.access_token, getUserPlaylists]);
    
    // Refresh playlists when they change
    const refreshPlaylists = async () => {
        if (!token?.access_token) return;
        const pls = await getUserPlaylists();
        setPlaylists(pls);
    };

    // -----------------------
    // Load home content (featured playlists, new releases, recent albums)
    // Only loads once to avoid API overload
    // -----------------------
    useEffect(() => {
        if (!token?.access_token || homeContentLoaded.current) return;
        
        // Mark as loading immediately to prevent duplicate calls
        homeContentLoaded.current = true;
        
        async function loadHomeContent() {
            try {
                // Load featured playlists (cached in hook)
                const featured = await getFeaturedPlaylists().catch(err => {
                    console.warn("Failed to load featured playlists:", err);
                    return [];
                });
                setFeaturedPlaylists(featured);
                
                // Small delay to avoid rate limits
                await new Promise(r => setTimeout(r, 150));
                
                // Load new releases (cached in hook)
                const releases = await getNewReleases().catch(err => {
                    console.warn("Failed to load new releases:", err);
                    return [];
                });
                setNewReleases(releases);
                
                // Small delay to avoid rate limits
                await new Promise(r => setTimeout(r, 150));
                
                // Load recently played and extract unique albums (recently played is cached in hook)
                const recent = await getRecentlyPlayed().catch(err => {
                    console.warn("Failed to load recently played:", err);
                    return [];
                });
                
                // Extract unique albums from recently played tracks
                const uniqueAlbums = recent
                    .filter((track, index, self) => 
                        track?.album?.id && 
                        index === self.findIndex(t => t?.album?.id === track.album.id)
                    )
                    .map(track => track.album)
                    .filter(Boolean)
                    .slice(0, 20);
                setRecentAlbums(uniqueAlbums);
            } catch (error) {
                console.error("Error loading home content:", error);
                // Reset flag on error so it can retry if needed
                homeContentLoaded.current = false;
            }
        }
        loadHomeContent();
    }, [token?.access_token]); // Removed function dependencies - they're stable

    // -----------------------
    // Auto-logout if profile isn't loaded in 10 seconds
    // -----------------------
    useEffect(() => {
        // Only start timer if we have a token but no user profile
        if (!token?.access_token || user) return;

        const timeoutId = setTimeout(() => {
            // If profile still isn't loaded after 10 seconds, logout
            if (!user) {
                console.warn("Profile not loaded within 10 seconds. Auto-logging out...");
                logout();
            }
        }, 10000); // 10 seconds

        // Cleanup: clear timeout if user loads or component unmounts
        return () => clearTimeout(timeoutId);
    }, [token?.access_token, user, logout]);

    async function handleSearch(query) {
        if (!query) return;

        const data = await searchSpotify(query, "track");

        // Normalize: ensure we always pass an array of track objects
        const tracks = data?.tracks?.items || [];
        setSearchResults(tracks);
    }



    // -----------------------
    // Playlist click handler
    // -----------------------
    async function handlePlaylistClick(playlistId) {
        try {
            // Force refresh to get latest tracks
            const tracks = await getPlaylistTracks(playlistId, true);
            setCurrentTracks(tracks);
            setCurrentPlaylistId(playlistId);
            setHomeView(false);
            setSearchResults([]); // Clear search results when opening playlist
            // Set playing context for playlist tracks
            if (tracks.length > 0) {
                setPlayingContext({ tracks: tracks, currentIndex: 0 });
            }
        } catch (error) {
            console.error("Error loading playlist:", error);
            alert("Failed to load playlist. Please try again.");
        }
    }

    // -----------------------
    // Album click handler
    // -----------------------
    async function handleAlbumClick(album) {
        const tracks = await getAlbumTracks(album.id);
        setCurrentTracks(tracks);
        setHomeView(false);
        // Set playing context for album tracks
        if (tracks.length > 0) {
            setPlayingContext({ tracks: tracks, currentIndex: 0 });
        }
    }

    // -----------------------
    // Create playlist handler
    // -----------------------
    async function handleCreatePlaylist() {
        const name = prompt("Enter playlist name:");
        if (!name || !name.trim()) return;
        
        try {
            // Creates a private playlist by default
            await createPlaylist(name.trim());
            await refreshPlaylists();
        } catch (error) {
            alert("Failed to create playlist. Please try again.");
            console.error("Error creating playlist:", error);
        }
    }

    // -----------------------
    // Delete playlist handler
    // -----------------------
    async function handleDeletePlaylist(e, playlistId, playlistName) {
        e.stopPropagation(); // Prevent triggering playlist click
        if (!window.confirm(`Are you sure you want to delete "${playlistName}"?`)) return;
        
        try {
            await deletePlaylist(playlistId);
            await refreshPlaylists();
            // Clear current tracks if deleted playlist was being viewed
            if (currentPlaylistId === playlistId) {
                setCurrentTracks([]);
                setCurrentPlaylistId(null);
                setHomeView(true);
            }
        } catch (error) {
            alert("Failed to delete playlist. Please try again.");
            console.error("Error deleting playlist:", error);
        }
    }

    // -----------------------
    // Add track to playlist handler
    // -----------------------
    async function handleAddTrackToPlaylist(trackUri, playlistId = null) {
        let targetPlaylistId = playlistId || currentPlaylistId;
        
        if (!targetPlaylistId) {
            // Filter to only show user-owned playlists
            const ownedPlaylists = playlists.filter(p => p.owner?.id === user?.id);
            
            if (ownedPlaylists.length === 0) {
                alert("No playlists available. Please create a playlist first.");
                return;
            }
            
            // Show modal for playlist selection
            setPendingTrackUri(trackUri);
            setShowPlaylistModal(true);
            return;
        } else {
            // Check if the selected playlist is owned by the user
            const playlist = playlists.find(p => p.id === targetPlaylistId);
            if (playlist && playlist.owner?.id !== user?.id) {
                alert("You can only add tracks to playlists you own.");
                return;
            }
        }
        
        // Add track directly if playlist is already selected
        await addTrackToSelectedPlaylist(targetPlaylistId, trackUri);
    }

    // -----------------------
    // Add track to selected playlist
    // -----------------------
    async function addTrackToSelectedPlaylist(targetPlaylistId, trackUri) {
        try {
            await addTracksToPlaylist(targetPlaylistId, trackUri);
            // Refresh current playlist if we're viewing it
            if (targetPlaylistId === currentPlaylistId) {
                // Force refresh to get the newly added track
                const tracks = await getPlaylistTracks(currentPlaylistId, true);
                setCurrentTracks(tracks);
            }
            alert("Track added to playlist!");
        } catch (error) {
            if (error.message?.includes("Forbidden") || error.message?.includes("403")) {
                alert("You don't have permission to modify this playlist. You can only modify playlists you own.");
            } else {
                alert("Failed to add track to playlist.");
            }
            console.error("Error adding track:", error);
        }
    }

    // -----------------------
    // Handle playlist selection from modal
    // -----------------------
    async function handlePlaylistSelect(playlistId) {
        if (!pendingTrackUri) return;
        
        setShowPlaylistModal(false);
        await addTrackToSelectedPlaylist(playlistId, pendingTrackUri);
        setPendingTrackUri(null);
    }

    // -----------------------
    // Remove track from playlist handler
    // -----------------------
    async function handleRemoveTrackFromPlaylist(trackUri) {
        if (!currentPlaylistId) {
            alert("No playlist selected.");
            return;
        }
        
        // Check if the playlist is owned by the user
        const playlist = playlists.find(p => p.id === currentPlaylistId);
        if (playlist && playlist.owner?.id !== user?.id) {
            alert("You can only remove tracks from playlists you own.");
            return;
        }
        
        if (!window.confirm("Remove this track from the playlist?")) return;
        
        try {
            await removeTracksFromPlaylist(currentPlaylistId, trackUri);
            // Refresh playlist tracks (force refresh)
            const tracks = await getPlaylistTracks(currentPlaylistId, true);
            setCurrentTracks(tracks);
        } catch (error) {
            if (error.message?.includes("Forbidden") || error.message?.includes("403")) {
                alert("You don't have permission to modify this playlist. You can only modify playlists you own.");
            } else {
                alert("Failed to remove track from playlist.");
            }
            console.error("Error removing track:", error);
        }
    }

    if (loading) return <div>Loading…</div>;
    if (!token?.access_token) return <Login login={login} />;

    return (
        <div style={{ height: "100vh", width: "100vw", margin: 0 }}>
            <div className="row" style={{ height: "100%" }}>

                {/* LEFT COLUMN */}
                <div className="col-3" style={{ 
                    height: "100%", 
                    display: "flex", 
                    flexDirection: "column",
                    borderRight: "1px solid #333",
                    background: "#121212"
                }}>
                    <Profile user={user} refresh={refresh} logout={logout} />

                    {/* Home Button */}
                    <button 
                        className="btn btn-outline-primary w-100 my-2" 
                        onClick={() => {
                            setHomeView(true);
                            setSearchResults([]); // Clear search results
                        }}
                        style={{ margin: "10px" }}
                    >
                        Home
                    </button>

                    {/* Playlist Header */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 15px",
                        borderBottom: "1px solid #333",
                        background: "#181818"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "white" }}>
                            <span style={{ fontSize: "20px" }}>🎵</span>
                            <h5 style={{ margin: 0, fontWeight: "600", color: "white" }}>Playlist</h5>
                        </div>
                        <button
                            className="btn btn-sm"
                            onClick={handleCreatePlaylist}
                            style={{
                                background: "#1db954",
                                color: "white",
                                border: "none",
                                borderRadius: "20px",
                                padding: "4px 12px",
                                fontSize: "12px",
                                fontWeight: "600"
                            }}
                            title="Create new playlist"
                        >
                            +
                        </button>
                    </div>

                    {/* Scrollable Playlist List */}
                    <div 
                        className="playlist-scrollable"
                        style={{
                            flex: 1,
                            overflowY: "auto",
                            background: "#000",
                            padding: "5px 0",
                            borderLeft: "2px solid #1db954"
                        }}
                    >
                        {playlists.map(pl => (
                            <div
                                key={pl.id}
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    padding: "10px 15px",
                                    cursor: "pointer",
                                    color: "white",
                                    borderLeft: "3px solid transparent",
                                    transition: "all 0.2s",
                                    position: "relative"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#1a1a1a";
                                    e.currentTarget.style.borderLeftColor = "#1db954";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "transparent";
                                    e.currentTarget.style.borderLeftColor = "transparent";
                                }}
                                onClick={() => handlePlaylistClick(pl.id)}
                            >
                                <img
                                    src={pl.images?.[0]?.url || "https://via.placeholder.com/40"}
                                    alt={pl.name}
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        marginRight: "12px",
                                        borderRadius: "4px",
                                        objectFit: "cover"
                                    }}
                                />
                                <span style={{
                                    flex: 1,
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap"
                                }}>
                                    {pl.name}
                                </span>
                                <button
                                    onClick={(e) => handleDeletePlaylist(e, pl.id, pl.name)}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "#b3b3b3",
                                        padding: "4px 8px",
                                        borderRadius: "4px",
                                        fontSize: "16px",
                                        opacity: 0.7,
                                        transition: "all 0.2s"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.background = "#e22134";
                                        e.currentTarget.style.color = "white";
                                        e.currentTarget.style.opacity = 1;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.background = "transparent";
                                        e.currentTarget.style.color = "#b3b3b3";
                                        e.currentTarget.style.opacity = 0.7;
                                    }}
                                    title="Delete playlist"
                                >
                                    ×
                                </button>
                            </div>
                        ))}
                        {playlists.length === 0 && (
                            <div style={{
                                padding: "20px",
                                textAlign: "center",
                                color: "#b3b3b3",
                                fontSize: "14px"
                            }}>
                                No playlists yet. Click + to create one!
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div className="col-9" style={{ height: "100%", display: "flex", flexDirection: "column" }}>

                    {/* SEARCH BAR */}
                    <div className="row align-items-center p-2">
                        <div className="col pe-1">
                            <input
                                type="search"
                                className="form-control rounded"
                                placeholder="Search"
                                aria-label="Search"
                                onKeyDown={(e) => { 
                                    if (e.key === "Enter") {
                                        handleSearch(e.target.value);
                                    } else if (e.key === "Escape") {
                                        setSearchResults([]);
                                        e.target.value = "";
                                    }
                                }}
                                onChange={(e) => {
                                    // Clear search results if input is empty
                                    if (e.target.value === "") {
                                        setSearchResults([]);
                                    }
                                }}
                            />
                        </div>
                        <div className="col-auto ps-1 d-flex gap-2">
                            <button
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={() => {
                                    const field = document.querySelector("input[type=search]");
                                    if (field.value.trim()) {
                                        handleSearch(field.value);
                                    } else {
                                        setSearchResults([]);
                                    }
                                }}
                            >
                                Search
                            </button>
                            {searchResults.length > 0 && (
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={() => {
                                        setSearchResults([]);
                                        const field = document.querySelector("input[type=search]");
                                        if (field) field.value = "";
                                    }}
                                    title="Clear search"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* MAIN CONTENT */}
                    <div className="row flex-grow-1" style={{ overflowY: "auto" }}>
                        {searchResults.length > 0 ? (
                            <div className="p-3">
                                <SearchResults 
                                    results={searchResults} 
                                    playTrack={handlePlayTrack}
                                    onAddToPlaylist={handleAddTrackToPlaylist}
                                    playlists={playlists}
                                />
                            </div>
                        ) : homeView ? (
                            <HomeView
                                featuredPlaylists={featuredPlaylists}
                                newReleases={newReleases}
                                recentAlbums={recentAlbums}
                                onPlaylistClick={handlePlaylistClick}
                                onAlbumClick={handleAlbumClick}
                            />
                        ) : (
                            <div className="p-3">
                                <Playlist 
                                    title="Playlist" 
                                    tracks={currentTracks} 
                                    playTrack={handlePlayTrack}
                                    allTracks={currentTracks}
                                    onRemoveTrack={
                                        currentPlaylistId && playlists.find(p => p.id === currentPlaylistId)?.owner?.id === user?.id
                                            ? handleRemoveTrackFromPlaylist 
                                            : null
                                    }
                                />
                            </div>
                        )}
                    </div>



                    {/* FOOTER PLAYER */}
                    <div className="row" style={{
                        height: "15%",
                        borderTop: "1px solid #ddd",
                        padding: "10px",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                    }}>
                        {isReady ? (
                            <Player
                                track={track}
                                paused={paused}
                                togglePlay={togglePlay}
                                nextTrack={nextTrack}
                                previousTrack={previousTrack}
                                changeVolume={changeVolume}
                                volume={volume}
                                position={position}
                                duration={duration}
                                seek={seek}
                                repeatMode={repeatMode}
                                toggleRepeat={toggleRepeat}
                            />
                        ) : (
                            <div>Initializing Spotify Player…</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Playlist Selection Modal */}
            {showPlaylistModal && (
                <div
                    style={{
                        position: "fixed",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: "rgba(0, 0, 0, 0.8)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        zIndex: 1000
                    }}
                    onClick={() => {
                        setShowPlaylistModal(false);
                        setPendingTrackUri(null);
                    }}
                >
                    <div
                        style={{
                            background: "#181818",
                            borderRadius: "12px",
                            padding: "20px",
                            width: "90%",
                            maxWidth: "500px",
                            maxHeight: "80vh",
                            display: "flex",
                            flexDirection: "column",
                            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.5)"
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "20px"
                        }}>
                            <h4 style={{ margin: 0, color: "white", fontWeight: "600" }}>
                                Select Playlist
                            </h4>
                            <button
                                onClick={() => {
                                    setShowPlaylistModal(false);
                                    setPendingTrackUri(null);
                                }}
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "#b3b3b3",
                                    fontSize: "24px",
                                    cursor: "pointer",
                                    padding: "0",
                                    width: "30px",
                                    height: "30px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center"
                                }}
                            >
                                ×
                            </button>
                        </div>
                        
                        <div style={{
                            overflowY: "auto",
                            flex: 1,
                            maxHeight: "60vh"
                        }}>
                            {playlists
                                .filter(p => p.owner?.id === user?.id)
                                .map(pl => (
                                    <div
                                        key={pl.id}
                                        onClick={() => handlePlaylistSelect(pl.id)}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            padding: "12px",
                                            cursor: "pointer",
                                            borderRadius: "8px",
                                            marginBottom: "8px",
                                            transition: "background 0.2s",
                                            color: "white"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = "#2a2a2a"}
                                        onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                                    >
                                        <img
                                            src={pl.images?.[0]?.url || "https://via.placeholder.com/50"}
                                            alt={pl.name}
                                            style={{
                                                width: "50px",
                                                height: "50px",
                                                borderRadius: "6px",
                                                marginRight: "12px",
                                                objectFit: "cover"
                                            }}
                                        />
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: "600", fontSize: "15px" }}>
                                                {pl.name}
                                            </div>
                                            <div style={{ fontSize: "13px", color: "#b3b3b3", marginTop: "4px" }}>
                                                {pl.tracks?.total || 0} tracks
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            {playlists.filter(p => p.owner?.id === user?.id).length === 0 && (
                                <div style={{
                                    textAlign: "center",
                                    padding: "40px",
                                    color: "#b3b3b3"
                                }}>
                                    No playlists available. Create a playlist first.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
