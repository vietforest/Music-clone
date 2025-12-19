import { useEffect, useState } from "react";

export default function Player({
                                   track,
                                   paused,
                                   togglePlay,
                                   nextTrack,
                                   previousTrack,
                                   volume,
                                   changeVolume,
                                   position,
                                   duration,
                                   seek,
                                   repeatMode,
                                   toggleRepeat
                               }) {
    const [localPosition, setLocalPosition] = useState(position);

    useEffect(() => {
        if (!paused) setLocalPosition(position);
    }, [position, paused]);


    if (!track) return <div>No track playing</div>;

    const albumImage = track.album.images?.[2]?.url || track.album.images?.[0]?.url;

    const formatTime = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, "0")}`;
    };

    const handleSeek = (e) => {
        const newPos = Number(e.target.value);
        setLocalPosition(newPos);
        seek(newPos);
    };

    return (
        <div className="player-footer" style={{ width: "100%" }}>
            <img className="player-track-art" src={albumImage} alt="Album art" />

            {/* Track Info */}
            <div className="player-info col">
                <div className="title">{track.name}</div>
                <div className="artists">{track.artists.map(a => a.name).join(", ")}</div>
            </div>

            {/* PLAY / PAUSE / NEXT / PREVIOUS */}
            <div
                className="player-controls col"
                style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
            >
                <div style={{ display: "flex", gap: "15px", alignItems: "center", flexDirection: "column" }}>
                    <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
                        <button 
                            className="control-btn" 
                            onClick={toggleRepeat}
                            style={{
                                color: repeatMode !== "off" ? "#1db954" : "#b3b3b3",
                                background: repeatMode !== "off" ? "rgba(29, 185, 84, 0.2)" : "transparent",
                                border: repeatMode !== "off" ? "1px solid #1db954" : "1px solid transparent",
                                borderRadius: "50%",
                                width: "40px",
                                height: "40px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "18px",
                                transition: "all 0.2s"
                            }}
                            title={
                                repeatMode === "off" ? "Enable repeat" :
                                repeatMode === "track" ? "Looping track (click for playlist loop)" :
                                "Looping playlist (click to disable)"
                            }
                        >
                            {repeatMode === "track" ? "🔂" : "🔁"}
                        </button>
                        <button className="control-btn" onClick={previousTrack}>⏮</button>
                        <button className="control-btn" onClick={togglePlay}>
                            {paused ? "▶" : "⏸"}
                        </button>
                        <button className="control-btn" onClick={nextTrack}>⏭</button>
                    </div>
                    
                    {/* Loop Mode Indicator */}
                    {repeatMode !== "off" && (
                        <div style={{
                            fontSize: "11px",
                            color: "#1db954",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            marginTop: "-5px"
                        }}>
                            {repeatMode === "track" ? "Looping Track" : "Looping Playlist"}
                        </div>
                    )}
                </div>

                {/* 🎵 Playback Progress Bar Under Controls */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        width: "100%",
                        marginTop: "8px",
                        maxWidth: "350px",
                    }}
                >
                    <span style={{ fontSize: "12px" }}>{formatTime(localPosition)}</span>

                    <input
                        type="range"
                        min="0"
                        max={duration}
                        value={localPosition}
                        onChange={handleSeek}
                        style={{ flex: 1, margin: "0 8px" }}
                    />

                    <span style={{ fontSize: "12px" }}>{formatTime(duration)}</span>
                </div>
            </div>

            {/* Volume */}
            <div className="player-controls col">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                     fill="currentColor" className="bi bi-volume-up-fill"
                     viewBox="0 0 16 16">
                    <path d="M11.536 14.01A8.47 8.47 0 0 0 14.026 8a8.47 8.47 0 0 0-2.49-6.01l-.708.707A7.48 7.48 0 0 1 13.025 8c0 2.071-.84 3.946-2.197 5.303z"/>
                    <path d="M10.121 12.596A6.48 6.48 0 0 0 12.025 8a6.48 6.48 0 0 0-1.904-4.596l-.707.707A5.48 5.48 0 0 1 11.025 8a5.48 5.48 0 0 1-1.61 3.89z"/>
                    <path d="M8.707 11.182A4.5 4.5 0 0 0 10.025 8a4.5 4.5 0 0 0-1.318-3.182L8 5.525A3.5 3.5 0 0 1 9.025 8 3.5 3.5 0 0 1 8 10.475zM6.717 3.55A.5.5 0 0 1 7 4v8a.5.5 0 0 1-.812.39L3.825 10.5H1.5A.5.5 0 0 1 1 10V6a.5.5 0 0 1 .5-.5h2.325l2.363-1.89a.5.5 0 0 1 .529-.06"/>
                </svg>

                <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => changeVolume(Number(e.target.value))}
                    style={{ marginLeft: "10px" }}
                />
                <span style={{ marginLeft: "5px" }}>{volume}%</span>
            </div>
        </div>
    );
}
