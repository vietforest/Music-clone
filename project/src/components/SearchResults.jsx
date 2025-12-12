// SearchResults.js

import { useState, useEffect } from "react";
import useSpotifyAuth from "../hooks/useSpotifyAuth";

// Accept clearResults, currentPlaylistId, and reloadPlaylistTracks as props
export default function SearchResults({
                                          results,
                                          playTrack,
                                          clearResults,
                                          currentPlaylistId,
                                          reloadPlaylistTracks
                                      }) {
    const { getUserPlaylists, addTracksToPlaylist } = useSpotifyAuth();
    const [playlists, setPlaylists] = useState([]);
    const [loadingAdd, setLoadingAdd] = useState({}); // trackUri -> boolean
    const [successAdd, setSuccessAdd] = useState({}); // trackUri -> message
    const [errorAdd, setErrorAdd] = useState({});     // trackUri -> message

    // Load playlists once
    useEffect(() => {
        async function loadPlaylists() {
            try {
                const pls = await getUserPlaylists();
                setPlaylists(pls);
            } catch (err) {
                console.error(err);
            }
        }
        loadPlaylists();
    }, [getUserPlaylists]);

    if (!results || results.length === 0) {
        return <div className="p-3 text-muted">No results found.</div>;
    }

    const handleAddTrack = async (trackUri, playlistId) => {
        setLoadingAdd(prev => ({ ...prev, [trackUri]: true }));
        setSuccessAdd(prev => ({ ...prev, [trackUri]: "" }));
        setErrorAdd(prev => ({ ...prev, [trackUri]: "" }));

        try {
            await addTracksToPlaylist(playlistId, trackUri);
            setSuccessAdd(prev => ({ ...prev, [trackUri]: "Added!" }));

            // Check if the modified playlist is the one currently being viewed
            if (currentPlaylistId === playlistId) {
                // 🔥 Reload the tracks for the currently displayed playlist
                await reloadPlaylistTracks(playlistId);
            }

            // 🔥 Clear search results after a short delay to switch the view back
            // The user will see the "Added!" message, and then the view switches
            setTimeout(() => {
                clearResults();
            }, 500);

        } catch (err) {
            setErrorAdd(prev => ({ ...prev, [trackUri]: err.message || "Failed to add track" }));
        } finally {
            setLoadingAdd(prev => ({ ...prev, [trackUri]: false }));
        }
    };

    return (
        <div className="search-results-container d-flex flex-column gap-2">
            {results.map((track, index) => {
                const key = `${track.id}-${index}`;
                const img = track.album.images?.[2]?.url || track.album.images?.[0]?.url;

                return (
                    <div
                        key={key}
                        className="search-result-item d-flex align-items-center p-2 rounded"
                        style={{
                            cursor: "pointer",
                            transition: "background 0.2s",
                            background: "transparent",
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = "#282828"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                        <img
                            src={img}
                            alt={track.name}
                            style={{
                                width: "60px",
                                height: "60px",
                                borderRadius: "4px",
                                marginRight: "12px",
                                objectFit: "cover",
                            }}
                            onClick={() => playTrack(track.uri)}
                        />

                        <div className="d-flex flex-column flex-grow-1">
                            <span style={{ fontWeight: "600", color: "white" }}>{track.name}</span>
                            <span style={{ fontSize: "0.85rem", color: "#b3b3b3" }}>
                                {track.artists.map(a => a.name).join(", ")}
                            </span>

                            {/* Add to Playlist */}
                            {playlists.length > 0 && (
                                <div className="mt-1 d-flex align-items-center gap-2">
                                    <select
                                        className="form-select form-select-sm"
                                        style={{ maxWidth: "200px" }}
                                        onChange={e => handleAddTrack(track.uri, e.target.value)}
                                        defaultValue=""
                                    >
                                        <option value="" disabled>Add to playlist…</option>
                                        {playlists.map(pl => (
                                            <option key={pl.id} value={pl.id}>{pl.name}</option>
                                        ))}
                                    </select>
                                    {loadingAdd[track.uri] && <span style={{ color: "#ccc" }}>Adding...</span>}
                                    {successAdd[track.uri] && <span style={{ color: "#1db954" }}>{successAdd[track.uri]}</span>}
                                    {errorAdd[track.uri] && <span style={{ color: "#f44336" }}>{errorAdd[track.uri]}</span>}
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}