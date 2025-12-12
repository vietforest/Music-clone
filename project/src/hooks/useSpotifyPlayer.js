import { useEffect, useRef, useState } from "react";

export default function useSpotifyPlayer(accessToken, logout) {
    const [isReady, setIsReady] = useState(false);
    const [deviceId, setDeviceId] = useState(null);
    const [track, setTrack] = useState(null);
    const [paused, setPaused] = useState(true);
    const [volume, setVolume] = useState(50);
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(0);

    const playerRef = useRef(null);
    const scriptLoadedRef = useRef(false);
    const hasConnectedRef = useRef(false);

    // ==============================
    // INIT SPOTIFY PLAYER + ERRORS
    // ==============================
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

            // ---- SUCCESS ----
            player.addListener("ready", ({ device_id }) => {
                console.log("Player ready:", device_id);
                setDeviceId(device_id);
                setIsReady(true);
                hasConnectedRef.current = true;
            });

            // ---- TRACK STATE ----
            player.addListener("player_state_changed", (state) => {
                if (!state) return;
                const t = state.track_window?.current_track ?? null;
                setTrack(t);
                setPaused(Boolean(state.paused));
                setPosition(state.position ?? 0);
                setDuration(state.duration ?? 0);
            });

            // ==============================
            // ERROR EVENTS → AUTO LOGOUT
            // ==============================
            player.addListener("initialization_error", ({ message }) => {
                console.error("Initialization error:", message);
                logout();
            });

            player.addListener("authentication_error", ({ message }) => {
                console.error("Auth error:", message);
                logout();
            });

            player.addListener("account_error", ({ message }) => {
                console.error("Account error:", message);
                logout();
            });

            player.addListener("not_ready", ({ device_id }) => {
                console.warn("Device offline:", device_id);
                logout();
            });

            // ---- CONNECT PLAYER ----
            player.connect().then((success) => {
                if (!success) {
                    console.warn("Player failed to connect.");
                }
            });
        };

        // Load SDK if not already added
        if (!scriptLoadedRef.current) {
            const script = document.createElement("script");
            script.src = "https://sdk.scdn.co/spotify-player.js";
            script.async = true;
            document.body.appendChild(script);
            scriptLoadedRef.current = true;
        }

        // ==============================
        // TIMEOUT: If player never ready
        // ==============================
        const timeout = setTimeout(() => {
            if (!isReady) {
                console.warn("Player failed to initialize (timeout). Logging out…");
                logout();
            }
        }, 8000); // 8 seconds

        return () => clearTimeout(timeout);

    }, [accessToken, isReady, logout]);

    // ==============================
    // CLEANUP
    // ==============================
    useEffect(() => {
        return () => {
            if (playerRef.current) {
                try {
                    playerRef.current.disconnect();
                } catch {}
                playerRef.current = null;
                hasConnectedRef.current = false;
            }
        };
    }, []);

    // ==============================
    // UPDATE POSITION EVERY SECOND
    // ==============================
    useEffect(() => {
        let interval;
        if (!paused) {
            interval = setInterval(() => {
                setPosition((p) => Math.min(duration, p + 1000));
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [paused, duration]);


    // ==============================
    // WEB API Helper
    // ==============================
    async function webApiCall(path, method = "POST") {
        if (!accessToken || !deviceId) return;

        const url = `https://api.spotify.com/v1/me/player${path}?device_id=${deviceId}`;
        const res = await fetch(url, { method, headers: { Authorization: `Bearer ${accessToken}` } });

        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            console.error("Web API error:", body);
            // If Spotify API says token invalid → logout
            if (body.error?.status === 401) logout();
        }
    }

    // ==============================
    // CONTROLS
    // ==============================
    async function play(uri) {
        if (!uri) return;
        await fetch(
            `https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`,
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

    async function previousTrack() {
        return playerRef.current?.previousTrack() || webApiCall("/previous");
    }

    async function nextTrack() {
        return playerRef.current?.nextTrack() || webApiCall("/next");
    }

    async function togglePlay() {
        if (playerRef.current?.togglePlay) {
            return playerRef.current.togglePlay();
        }
        paused ? webApiCall("/play", "PUT") : webApiCall("/pause", "PUT");
        setPaused((p) => !p);
    }

    async function changeVolume(newVolume) {
        setVolume(newVolume);
        if (playerRef.current?.setVolume) {
            return playerRef.current.setVolume(newVolume / 100);
        }
        webApiCall(`/volume?volume_percent=${newVolume}`, "PUT");
    }

    async function seek(positionMs) {
        setPosition(positionMs);
        if (playerRef.current?.seek) {
            return playerRef.current.seek(positionMs);
        }
        webApiCall(`/seek?position_ms=${positionMs}`, "PUT");
    }

    return {
        track,
        paused,
        isReady,
        deviceId,
        volume,
        position,
        duration,
        play,
        togglePlay,
        nextTrack,
        previousTrack,
        changeVolume,
        seek,
        playerRef,
    };
}
