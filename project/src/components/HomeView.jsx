export default function HomeView({ 
    featuredPlaylists, 
    newReleases, 
    recentAlbums, 
    onPlaylistClick, 
    onAlbumClick 
}) {
    const renderGrid = (items, title, itemType = "playlist") => {
        if (!items || items.length === 0) return null;

        return (
            <div style={{ marginBottom: "40px" }}>
                <h3 style={{ 
                    color: "white", 
                    fontSize: "24px", 
                    fontWeight: "700", 
                    marginBottom: "20px" 
                }}>
                    {title}
                </h3>
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                    gap: "20px",
                }}>
                    {items.map((item) => {
                        const image = item.images?.[0]?.url;
                        const name = item.name;
                        const id = item.id;

                        return (
                            <div
                                key={id}
                                onClick={() => {
                                    if (itemType === "playlist") {
                                        onPlaylistClick?.(id);
                                    } else {
                                        onAlbumClick?.(item);
                                    }
                                }}
                                style={{
                                    cursor: "pointer",
                                    transition: "transform 0.2s, opacity 0.2s",
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = "scale(1.05)";
                                    e.currentTarget.style.opacity = "0.9";
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = "scale(1)";
                                    e.currentTarget.style.opacity = "1";
                                }}
                            >
                                <img
                                    src={image}
                                    alt={name}
                                    style={{
                                        width: "100%",
                                        aspectRatio: "1",
                                        borderRadius: "8px",
                                        objectFit: "cover",
                                        marginBottom: "12px",
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                                    }}
                                />
                                <div
                                    style={{
                                        color: "white",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                    }}
                                    title={name}
                                >
                                    {name}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div style={{ 
            padding: "20px", 
            color: "white",
            background: "#121212",
            minHeight: "100%",
        }}>
            {renderGrid(featuredPlaylists, "Browse", "playlist")}
            {renderGrid(recentAlbums, "Recently Played", "album")}
            {renderGrid(newReleases, "New Releases", "album")}
            
            {(!featuredPlaylists || featuredPlaylists.length === 0) && 
             (!recentAlbums || recentAlbums.length === 0) && 
             (!newReleases || newReleases.length === 0) && (
                <div style={{ 
                    textAlign: "center", 
                    padding: "40px",
                    color: "#b3b3b3"
                }}>
                    <p>Loading content...</p>
                </div>
            )}
        </div>
    );
}
