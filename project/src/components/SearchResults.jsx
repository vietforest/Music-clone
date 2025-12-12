export default function SearchResults({ results, playTrack }) {
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
                            cursor: "pointer",
                            transition: "background 0.2s",
                        }}
                        onClick={() => playTrack(track.uri)}
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
                                objectFit: "cover"
                            }}
                        />
                        <div className="d-flex flex-column">
                            <span style={{ fontWeight: "600", color: "white" }}>{track.name}</span>
                            <span style={{ fontSize: "0.85rem", color: "#b3b3b3" }}>
                                {track.artists.map(a => a.name).join(", ")}
                            </span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
