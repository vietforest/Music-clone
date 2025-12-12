// App.js

import { useState, useEffect, useRef } from "react"; // Added useRef
import useSpotifyAuth from "./hooks/useSpotifyAuth";
import useSpotifyPlayer from "./hooks/useSpotifyPlayer";
import Login from "./components/Login";
import Profile from "./components/Profile";
import SearchResults from "./components/SearchResults";
import Player from "./components/Player";
import Playlist from "./components/Playlist";

import './App.css';
import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap/dist/js/bootstrap.js';

export default function App() {
    const {
        loading,
        token,
        user,
        login,
        refresh,
        logout,
        searchSpotify,
        getUserPlaylists,
        getPlaylistTracks,
        getRecentlyPlayed,
        // 🔥 ADDED NEW FUNCTIONS
        createPlaylist,
        deletePlaylist
    } = useSpotifyAuth();

    // 🔥 PASS logout into the hook so it can auto-log out on failure
    const {
        track,
        paused,
        play,
        togglePlay,
        nextTrack,
        previousTrack,
        isReady,
        changeVolume,
        volume,
        position,
        duration,
        seek
    } = useSpotifyPlayer(token?.access_token, logout);

    const [searchResults, setSearchResults] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [currentTracks, setCurrentTracks] = useState([]);
    const [homeView, setHomeView] = useState(true);
    const [currentPlaylistId, setCurrentPlaylistId] = useState(null);

    // 🔥 NEW STATE: To force playlist list reload
    // 🔥 NEW STATE: For handling new playlist creation
    const [newPlaylistName, setNewPlaylistName] = useState("");
    const [createPlaylistError, setCreatePlaylistError] = useState(null);
    const createInputRef = useRef(null);


    // -----------------------
    // Load user playlists (Modified to use trigger)
    // -----------------------
    useEffect(() => {
        if (!token?.access_token) return;
        async function loadPlaylists() {
            const pls = await getUserPlaylists(true); // Force refresh is recommended after creating/deleting
            setPlaylists(pls);
        }
        loadPlaylists();
    }, [token?.access_token]); // Added dependency

    // -----------------------
    // Load recent tracks (unchanged)
    // -----------------------
    useEffect(() => {
        if (!token?.access_token || !homeView) return;
        async function loadRecent() {
            const recent = await getRecentlyPlayed();
            setCurrentTracks(recent);
        }
        loadRecent();
    }, [token?.access_token, homeView]);

    async function handleSearch(query) {
        if (!query) return;
        const data = await searchSpotify(query, "track");
        const tracks = data?.tracks?.items || [];
        setSearchResults(tracks);
    }

    /**
     * @description Fetches and sets the tracks for the playlist with the given ID.
     * @param {string} playlistId
     */
    async function reloadPlaylistTracks(playlistId) {
        if (!playlistId) return;

        const tracks = await getPlaylistTracks(playlistId, true); // Force refresh track list
        setCurrentTracks(tracks);
        // Important: Keep the view state correct if we are reloading
        setHomeView(false);
    }


    // -----------------------
    // Playlist click handler (updated to save ID)
    // -----------------------
    async function handlePlaylistClick(playlistId) {
        // Fetch and set tracks
        await reloadPlaylistTracks(playlistId);

        // Store the ID of the playlist we just clicked
        setCurrentPlaylistId(playlistId);
    }

    // -----------------------
    // NEW: Create Playlist Handler
    // -----------------------
    async function handleCreatePlaylist() {
        if (!newPlaylistName.trim()) {
            setCreatePlaylistError("Name cannot be empty.");
            createInputRef.current.focus();
            return;
        }

        try {
            setCreatePlaylistError(null);
            await createPlaylist(newPlaylistName.trim());
            setNewPlaylistName("");

            // Force playlist list reload
            setPlaylistRefreshTrigger(t => t + 1);

            // Clear search results if they were visible
            clearSearchResults();

        } catch (error) {
            setCreatePlaylistError(`Failed to create: ${error.message}`);
        }
    }

    // -----------------------
    // NEW: Delete Playlist Handler
    // -----------------------
    async function handleDeletePlaylist(playlistId, playlistName) {
        if (!window.confirm(`Are you sure you want to delete/unfollow playlist "${playlistName}"?`)) {
            return;
        }

        try {
            await deletePlaylist(playlistId);

            // If the deleted playlist was the one currently viewed, switch to home
            if (currentPlaylistId === playlistId) {
                setCurrentPlaylistId(null);
                setHomeView(true);
            }

            // Force playlist list reload
            setPlaylistRefreshTrigger(t => t + 1);

        } catch (error) {
            alert(`Failed to delete playlist: ${error.message}`);
        }
    }


    // New function to clear search results (unchanged)
    function clearSearchResults() {
        setSearchResults([]);
    }

    if (loading) return <div>Loading…</div>;
    if (!token?.access_token) return <Login login={login} />;

    return (
        <div style={{ height: "100vh", width: "100vw", margin: 0 }}>
            <div className="row" style={{ height: "100%" }}>

                {/* LEFT COLUMN */}
                <div className="col-3" style={{ height: "100%", overflowY: "auto", borderRight: "1px solid #ddd" }}>
                    <Profile user={user} refresh={refresh} logout={logout} />

                    <button className="btn btn-outline-primary w-100 my-2"
                            onClick={() => {
                                setHomeView(true);
                                setCurrentPlaylistId(null); // Clear ID when going home
                            }}>
                        Home
                    </button>

                    {/* 🔥 NEW: Create Playlist UI */}
                    <div className="mb-3 p-2 border-top border-bottom">
                        <h6 className="text-white">New Playlist</h6>
                        <div className="input-group input-group-sm">
                            <input
                                ref={createInputRef}
                                type="text"
                                className="form-control"
                                placeholder="Playlist Name"
                                value={newPlaylistName}
                                onChange={(e) => {
                                    setNewPlaylistName(e.target.value);
                                    if (createPlaylistError) setCreatePlaylistError(null);
                                }}
                                onKeyDown={(e) => { if (e.key === "Enter") handleCreatePlaylist(); }}
                            />
                            <button className="btn btn-success" type="button" onClick={handleCreatePlaylist}>
                                +
                            </button>
                        </div>
                        {createPlaylistError && <small className="text-danger">{createPlaylistError}</small>}
                    </div>

                    {playlists.map(pl => (
                        <div key={pl.id}
                             className="playlist-link p-2 d-flex justify-content-between align-items-center"
                             style={{
                                 cursor: "pointer",
                                 backgroundColor: pl.id === currentPlaylistId && !homeView ? '#303030' : 'transparent'
                             }}>

                            {/* Playlist Name & Image */}
                            <div className="d-flex align-items-center flex-grow-1" onClick={() => handlePlaylistClick(pl.id)}>
                                <img src={pl.images?.[0]?.url} alt={pl.name}
                                     style={{ width: "40px", height: "40px", marginRight: "8px", borderRadius: "4px" }} />
                                {pl.name}
                            </div>

                            {/* 🔥 NEW: Delete Button */}
                            {pl.owner.id === user?.id && ( // Only show delete for owned playlists
                                <button
                                    className="btn btn-sm btn-outline-danger ms-2"
                                    style={{ padding: '0 8px', lineHeight: '1.5' }}
                                    onClick={(e) => {
                                        e.stopPropagation(); // Prevent handlePlaylistClick from firing
                                        handleDeletePlaylist(pl.id, pl.name);
                                    }}>
                                    &times;
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                {/* RIGHT COLUMN (unchanged) */}
                <div className="col-9" style={{ height: "100%", display: "flex", flexDirection: "column" }}>

                    {/* SEARCH BAR (unchanged) */}
                    <div className="row align-items-center p-2">
                        <div className="col pe-1">
                            <input
                                type="search"
                                className="form-control rounded"
                                placeholder="Search"
                                aria-label="Search"
                                onKeyDown={(e) => { if (e.key === "Enter") handleSearch(e.target.value); }}
                            />
                        </div>
                        <div className="col-auto ps-1">
                            <button
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={() => {
                                    const field = document.querySelector("input[type=search]");
                                    handleSearch(field.value);
                                }}
                            >
                                Search
                            </button>
                        </div>
                    </div>

                    {/* MAIN CONTENT */}
                    <div className="row flex-grow-1 p-2" style={{ overflowY: "auto", borderTop: "1px solid #ddd" }}>
                        {searchResults.length > 0 ? (
                            <SearchResults
                                results={searchResults}
                                playTrack={play}
                                clearResults={clearSearchResults}
                                currentPlaylistId={currentPlaylistId}
                                reloadPlaylistTracks={reloadPlaylistTracks}
                            />
                        ) : (
                            <Playlist title={homeView ? "Recently Played" : "Playlist"} tracks={currentTracks} playTrack={play} />
                        )}
                    </div>

                    {/* FOOTER PLAYER (unchanged) */}
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
                            />
                        ) : (
                            <div>Initializing Spotify Player…</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}