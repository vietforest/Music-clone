export default function Playlists({
    playlists,
    playlistsError,
    currentPlaylistId,
    view,
    onHome,
    onRefresh,
    onSelect,
    onDelete,
    userId,
    newPlaylistName,
    setNewPlaylistName,
    createPlaylistError,
    onCreate,
    createInputRef,
    clearCreatePlaylistError,
}) {
    return (
        <div
            style={{
                backgroundColor: "#0f0f0f",
                borderRadius: "10px",
                padding: "12px",
                border: "1px solid #1f1f1f",
                height: "calc(100vh - 80px)",
                display: "flex",
                flexDirection: "column",
            }}
        >
            <div className="d-grid gap-2 mb-2">
                <button className="btn btn-outline-primary w-100" onClick={onHome}>
                    Home
                </button>
                <button className="btn btn-outline-secondary w-100" onClick={onRefresh}>
                    Refresh Playlists
                </button>
            </div>

            {playlistsError && (
                <div className="alert alert-warning p-2">
                    {playlistsError}
                </div>
            )}

            <div className="mb-3 p-2 border-top border-bottom">
                <h6 className="text-white mb-2">New Playlist</h6>
                <div className="input-group input-group-sm">
                    <input
                        ref={createInputRef}
                        type="text"
                        className="form-control"
                        placeholder="Playlist Name"
                        value={newPlaylistName}
                        onChange={(e) => {
                            setNewPlaylistName(e.target.value);
                            if (createPlaylistError) clearCreatePlaylistError();
                        }}
                        onKeyDown={(e) => { if (e.key === "Enter") onCreate(); }}
                    />
                    <button className="btn btn-success" type="button" onClick={onCreate}>
                        +
                    </button>
                </div>
                {createPlaylistError && <small className="text-danger">{createPlaylistError}</small>}
            </div>

            <div style={{ overflowY: "auto", flexGrow: 1, paddingRight: "6px" }}>
                {(playlists || []).map(pl => (
                    <div key={pl.id}
                         className="playlist-link p-2 d-flex justify-content-between align-items-center"
                         style={{
                             cursor: "pointer",
                             borderRadius: "6px",
                             backgroundColor: pl.id === currentPlaylistId && view === "playlist" ? '#1d1d1d' : 'transparent',
                             transition: "background 0.2s",
                         }}
                         onMouseEnter={(e) => e.currentTarget.style.background = "#1d1d1d"}
                         onMouseLeave={(e) => {
                             if (!(pl.id === currentPlaylistId && view === "playlist")) e.currentTarget.style.background = "transparent";
                         }}
                    >
                        <div className="d-flex align-items-center flex-grow-1" onClick={() => onSelect(pl.id)}>
                            <img src={pl.images?.[0]?.url} alt={pl.name}
                                 style={{ width: "44px", height: "44px", marginRight: "10px", borderRadius: "6px", objectFit: "cover" }} />
                            <div className="text-white" style={{ fontWeight: 600 }}>{pl.name}</div>
                        </div>
                        {pl.owner?.id === userId && (
                            <button
                                className="btn btn-sm btn-outline-danger ms-2"
                                style={{ padding: '0 8px', lineHeight: '1.5' }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(pl.id, pl.name);
                                }}>
                                &times;
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

