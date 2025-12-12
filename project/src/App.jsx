import { useState, useEffect } from "react";
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
    const { loading, token, user, login, refresh, logout, searchSpotify, getUserPlaylists, getPlaylistTracks, getRecentlyPlayed } = useSpotifyAuth();
    const { track, paused, play, togglePlay, nextTrack, previousTrack, isReady, changeVolume, volume, position, duration, seek } = useSpotifyPlayer(token?.access_token);

    const [searchResults, setSearchResults] = useState([]);
    const [playlists, setPlaylists] = useState([]);
    const [currentTracks, setCurrentTracks] = useState([]);
    const [homeView, setHomeView] = useState(true); // true: show recent tracks, false: show playlists

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
    }, [token?.access_token]);

    // -----------------------
    // Load recent tracks for Home view
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

        // Normalize: ensure we always pass an array of track objects
        const tracks = data?.tracks?.items || [];
        setSearchResults(tracks);
    }



    // -----------------------
    // Playlist click handler
    // -----------------------
    async function handlePlaylistClick(playlistId) {
        const tracks = await getPlaylistTracks(playlistId);
        setCurrentTracks(tracks);
        setHomeView(false);
    }

    if (loading) return <div>Loading…</div>;
    if (!token?.access_token) return <Login login={login} />;

    return (
        <div style={{ height: "100vh", width: "100vw", margin: 0 }}>
            <div className="row" style={{ height: "100%" }}>

                {/* LEFT COLUMN */}
                <div className="col-3" style={{ height: "100%", overflowY: "auto", borderRight: "1px solid #ddd" }}>
                    <Profile user={user} refresh={refresh} logout={logout} />

                    {/* Home Button */}
                    <button className="btn btn-outline-primary w-100 my-2" onClick={() => setHomeView(true)}>
                        Home
                    </button>

                    {/* Playlists */}
                    {playlists.map(pl => (
                        <div key={pl.id} className="playlist-link p-2" style={{ cursor: "pointer" }}
                             onClick={() => handlePlaylistClick(pl.id)}>
                            <img src={pl.images?.[0]?.url} alt={pl.name} style={{ width: "40px", height: "40px", marginRight: "8px", borderRadius: "4px" }} />
                            {pl.name}
                        </div>
                    ))}
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
                            <SearchResults results={searchResults} playTrack={play} />
                        ) : (
                            <Playlist title={homeView ? "Recently Played" : "Playlist"} tracks={currentTracks} playTrack={play} />
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
