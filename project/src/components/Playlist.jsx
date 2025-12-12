export default function Playlist({ title, tracks, playTrack, playlistImage }) {
    if (!tracks || tracks.length === 0) {
        return <div className="p-3 text-muted">No songs in this playlist.</div>;
    }

    return (
        <div
            className="playlist-container"
            style={{
                width: "100%",
                background: "#1a1a1a",
                color: "white",
                padding: "20px",
                borderRadius: "12px",
            }}
        >
            {/* Header */}
            <div className="d-flex align-items-center" style={{ marginBottom: "20px" }}>
                {playlistImage && (
                    <img
                        src={playlistImage}
                        alt="playlist cover"
                        style={{
                            width: "50px",
                            height: "50px",
                            borderRadius: "8px",
                            marginRight: "12px",
                            objectFit: "cover",
                        }}
                    />
                )}
                <h4 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>{title}</h4>
            </div>

            {/* Table header */}
            <div
                className="playlist-header d-flex"
                style={{
                    padding: "10px 15px",
                    color: "#b3b3b3",
                    fontSize: "14px",
                    borderBottom: "1px solid #333",
                }}
            >
                <div style={{ width: "40px" }}></div>
                <div style={{ flex: 2 }}>Title</div>
                <div style={{ flex: 2 }}>Album</div>
                <div style={{ flex: 1 }}>Artist</div>
                <div style={{ width: "50px", textAlign: "right" }}>⏱️</div>
            </div>

            {/* Scroll area */}
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
                {tracks.map((track, index) => {
                    if (!track) return null;

                    const key = track.id ? `${track.id}-${index}` : `fallback-${index}`;

                    const img = track.album?.images?.[2]?.url || track.album?.images?.[0]?.url;
                    const durationMs = track.duration_ms || 0;
                    const minutes = Math.floor(durationMs / 60000);
                    const seconds = Math.floor((durationMs % 60000) / 1000)
                        .toString()
                        .padStart(2, "0");

                    return (
                        <div
                            key={key}
                            className="d-flex align-items-center playlist-row"
                            style={{
                                padding: "10px 15px",
                                cursor: "pointer",
                                borderBottom: "1px solid #222",
                                transition: "background 0.2s",
                            }}
                            onClick={() => playTrack(track.uri)}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a2a")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                        >
                            <div style={{ width: "40px", marginRight: "10px" }}>
                                <img
                                    src={img}
                                    alt="album"
                                    style={{
                                        width: "40px",
                                        height: "40px",
                                        borderRadius: "6px",
                                        objectFit: "cover",
                                    }}
                                />
                            </div>

                            <div style={{ flex: 2, fontSize: "15px", fontWeight: "500" }}>{track.name}</div>
                            <div style={{ flex: 2, fontSize: "14px", color: "#ccc" }}>{track.album?.name}</div>
                            <div style={{ flex: 1, fontSize: "14px", color: "#ccc" }}>
                                {track.artists?.map((a) => a.name).join(", ")}
                            </div>
                            <div style={{ width: "50px", textAlign: "right", color: "#ccc" }}>
                                {minutes}:{seconds}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
