import { useEffect, useRef, useState } from "react";

export default function useSpotifyPlayer(accessToken) {
    const [isReady, setIsReady] = useState(false);
    const [deviceId, setDeviceId] = useState(null);
    const [track, setTrack] = useState(null);
    const [paused, setPaused] = useState(true);
    const [volume, setVolume] = useState(50);
    const [position, setPosition] = useState(0);       
    const [duration, setDuration] = useState(0);      
    const [repeatMode, setRepeatMode] = useState("off"); 

    const playerRef = useRef(null);
    const scriptLoadedRef = useRef(false);
    const hasConnectedRef = useRef(false);
    const isTogglingRepeatRef = useRef(false); // Track if we're actively toggling

    // -------------------------
    // Initialize or update SDK
    // -------------------------
    useEffect(() => {
        if (!accessToken) return;

        window.onSpotifyWebPlaybackSDKReady = () => {
            if (hasConnectedRef.current) return;

            const player = new window.Spotify.Player({
                name: "Web Player (React)",
                getOAuthToken: (cb) => cb(accessToken),
                volume: 0.5,
            });

            playerRef.current = player;

            player.addListener("ready", ({ device_id }) => {
                setDeviceId(device_id);
                setIsReady(true);
                console.log("Spotify Player ready, device_id:", device_id);
            });

            player.addListener("player_state_changed", (state) => {
                if (!state) return;

                const currentTrack = state.track_window?.current_track ?? null;
                setTrack(currentTrack);
                setPaused(Boolean(state.paused));
                setPosition(state.position ?? 0);    // ✅ Update position
                setDuration(state.duration ?? 0);    // ✅ Update duration
                
                // Update repeat mode from state (Spotify returns 0=off, 1=track, 2=context)
                // Only update if we're not actively toggling to avoid conflicts
                if (state.repeat_mode !== undefined && !isTogglingRepeatRef.current) {
                    const modeMap = { 0: "off", 1: "track", 2: "context" };
                    const mode = typeof state.repeat_mode === "number" 
                        ? modeMap[state.repeat_mode] 
                        : state.repeat_mode;
                    if (mode) {
                        setRepeatMode(mode);
                    }
                }
                
                // Update queue context offset if we have a context
                if (currentTrack && queueContextRef.current.uris.length > 0) {
                    const currentUri = currentTrack.uri;
                    const newOffset = queueContextRef.current.uris.findIndex(uri => uri === currentUri);
                    if (newOffset >= 0) {
                        queueContextRef.current.offset = newOffset;
                    }
                }
            });

            player.connect().then((success) => {
                if (success) {
                    console.log("Connected to Spotify Player!");
                    hasConnectedRef.current = true;
                } else {
                    console.warn("Spotify Player connection failed");
                }
            });
        };

        if (!scriptLoadedRef.current) {
            const script = document.createElement("script");
            script.src = "https://sdk.scdn.co/spotify-player.js";
            script.async = true;
            document.body.appendChild(script);
            scriptLoadedRef.current = true;
        }
    }, [accessToken]);

    // -------------------------
    // Cleanup
    // -------------------------
    useEffect(() => {
        return () => {
            if (playerRef.current) {
                try {
                    playerRef.current.disconnect();
                } catch (e) {
                    console.error(e);
                }
                playerRef.current = null;
                hasConnectedRef.current = false;
            }
        };
    }, []);

    // Auto-update playback position every 1 second while playing
    useEffect(() => {
        let interval;

        if (!paused) {
            interval = setInterval(() => {
                setPosition((prev) => {
                    if (prev + 1000 >= duration) return duration;
                    return prev + 1000;
                });
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [paused, duration]);

    // Track end detection ref to prevent multiple restarts
    const trackEndHandledRef = useRef(false);
    const lastTrackUriRef = useRef(null);

    // Handle track end and restart in track loop mode
    useEffect(() => {
        if (!track || !duration) return;
        
        // Reset flag if track changed
        if (track.uri !== lastTrackUriRef.current) {
            trackEndHandledRef.current = false;
            lastTrackUriRef.current = track.uri;
        }
        
        // Check if track has ended (position is at or very close to duration) and we're in track loop mode
        if (repeatMode === "track" && position >= duration - 1000 && !trackEndHandledRef.current && !paused) {
            trackEndHandledRef.current = true;
            
            // Restart the same track by seeking to beginning
            const currentUri = track.uri;
            if (currentUri) {
                // Small delay to ensure track has fully ended
                setTimeout(async () => {
                    try {
                        // Seek to beginning
                        if (playerRef.current?.seek) {
                            await playerRef.current.seek(0);
                        } else if (deviceId) {
                            await webApiCall(`/seek?position_ms=0`, "PUT");
                        }
                        // Reset flag after a moment to allow for next loop
                        setTimeout(() => {
                            trackEndHandledRef.current = false;
                        }, 2000);
                    } catch (error) {
                        console.error("Error restarting track:", error);
                        trackEndHandledRef.current = false;
                    }
                }, 200);
            }
        }
    }, [position, duration, track, repeatMode, paused, deviceId]);


    // ---- Web API Helper ----
    async function webApiCall(path, method = "POST") {
        if (!accessToken) throw new Error("Missing access token");
        
        // Properly construct URL with query parameters
        const baseUrl = `https://api.spotify.com/v1/me/player${path}`;
        const url = new URL(baseUrl);
        if (deviceId) {
            url.searchParams.set("device_id", deviceId);
        }
        
        const res = await fetch(url.toString(), {
            method,
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error?.message || "Spotify API error");
        }
        return res;
    }

    // Track current queue context
    const queueContextRef = useRef({ uris: [], offset: 0 });

    // ---- Controls ----
    async function play(uri, context = null, offset = 0) {
        if (!uri) return;
        
        // If context is provided, use it for queue
        if (context && Array.isArray(context) && context.length > 0) {
            queueContextRef.current = { uris: context, offset: offset };
            await fetch(
                `https://api.spotify.com/v1/me/player/play${deviceId ? `?device_id=${deviceId}` : ""}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ 
                        uris: context,
                        offset: { position: offset }
                    }),
                }
            );
        } else {
            // Single track play
            queueContextRef.current = { uris: [uri], offset: 0 };
            await fetch(
                `https://api.spotify.com/v1/me/player/play${deviceId ? `?device_id=${deviceId}` : ""}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ uris: [uri] }),
                }
            );
        }
    }

    async function previousTrack() {
        const context = queueContextRef.current;
        
        // If we have a context and can go to previous track
        if (context.uris.length > 1 && context.offset > 0) {
            const newOffset = context.offset - 1;
            queueContextRef.current.offset = newOffset;
            await play(context.uris[newOffset], context.uris, newOffset);
            return;
        }
        
        // Fallback to Spotify's previous track
        if (playerRef.current?.previousTrack) return playerRef.current.previousTrack();
        return webApiCall("/previous");
    }

    async function nextTrack() {
        const context = queueContextRef.current;
        
        // If we have a context and can go to next track
        if (context.uris.length > 1 && context.offset < context.uris.length - 1) {
            const newOffset = context.offset + 1;
            queueContextRef.current.offset = newOffset;
            await play(context.uris[newOffset], context.uris, newOffset);
            return;
        }
        
        // Fallback to Spotify's next track
        if (playerRef.current?.nextTrack) return playerRef.current.nextTrack();
        return webApiCall("/next");
    }

    async function togglePlay() {
        if (playerRef.current?.togglePlay) return playerRef.current.togglePlay();
        if (paused) await webApiCall("/play", "PUT");
        else await webApiCall("/pause", "PUT");
        setPaused((p) => !p);
    }

    async function changeVolume(newVolume) {
        setVolume(newVolume);
        if (playerRef.current?.setVolume) return playerRef.current.setVolume(newVolume / 100);
        if (deviceId) return webApiCall(`/volume?volume_percent=${newVolume}`, "PUT");
    }

    // ---- ✅ Playback Control ----
    async function seek(positionMs) {
        setPosition(positionMs);
        if (playerRef.current?.seek) {
            return playerRef.current.seek(positionMs);
        } else if (deviceId) {
            return webApiCall(`/seek?position_ms=${positionMs}`, "PUT");
        }
    }

    // ---- Loop/Repeat Control ----
    async function toggleRepeat() {
        // Cycle through: off -> track -> context -> off
        let newMode;
        if (repeatMode === "off") {
            newMode = "track"; // Loop single song
        } else if (repeatMode === "track") {
            newMode = "context"; // Loop playlist/album
        } else {
            newMode = "off"; // No loop
        }
        
        // Set flag to prevent state sync from overriding
        isTogglingRepeatRef.current = true;
        
        try {
            // Optimistically update UI immediately
            setRepeatMode(newMode);
            
            // Make API call
            await webApiCall(`/repeat?state=${newMode}`, "PUT");
            
            // Clear flag after a short delay to allow state sync
            setTimeout(() => {
                isTogglingRepeatRef.current = false;
            }, 500);
        } catch (error) {
            console.error("Error setting repeat mode:", error);
            // Revert to previous mode on error
            setRepeatMode(repeatMode);
            isTogglingRepeatRef.current = false;
            alert("Failed to change repeat mode. Please try again.");
        }
    }

    return {
        track,
        paused,
        isReady,
        deviceId,
        volume,
        position,     // ✅ current playback position
        duration,     // ✅ track duration
        repeatMode,   // ✅ repeat mode: "off" | "track" | "context"
        play,
        togglePlay,
        nextTrack,
        previousTrack,
        changeVolume,
        seek,         // ✅ seek function
        toggleRepeat, // ✅ toggle repeat/loop
        playerRef,    // optional: pass ref to Player component
    };
}
