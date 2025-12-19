export default function SearchResults({ results, playTrack, onAddToPlaylist, playlists = [] }) {
    if (!results || results.length === 0) {
        return <div className="p-3 text-muted">No results found.</div>;
    }

    return (
        <div className="search-results-container d-flex flex-column gap-2">
            {results.map(track => {
                const img = track.album.images?.[2]?.url || track.album.images?.[0]?.url;
                return (
                    <div
                        key={track.id}
                        className="search-result-item d-flex align-items-center p-2 rounded"
                        style={{
                            transition: "background 0.2s",
                            position: "relative"
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
                                cursor: "pointer"
                            }}
                            onClick={() => playTrack(track.uri)}
                        />
                        <div 
                            className="d-flex flex-column"
                            style={{ flex: 1, cursor: "pointer" }}
                            onClick={() => playTrack(track.uri)}
                        >
                            <span style={{ fontWeight: "600", color: "white" }}>{track.name}</span>
                            <span style={{ fontSize: "0.85rem", color: "#b3b3b3" }}>
                                {track.artists.map(a => a.name).join(", ")}
                            </span>
                        </div>
                        {onAddToPlaylist && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAddToPlaylist(track.uri);
                                }}
                                style={{
                                    background: "#1db954",
                                    border: "none",
                                    color: "white",
                                    borderRadius: "20px",
                                    padding: "6px 12px",
                                    fontSize: "12px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    marginLeft: "10px"
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = "#1ed760"}
                                onMouseLeave={(e) => e.currentTarget.style.background = "#1db954"}
                                title="Add to playlist"
                            >
                                +
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
