import { useEffect, useRef, useState } from "react";

export default function useSpotifyPlayer(accessToken) {
    const [isReady, setIsReady] = useState(false);
    const [deviceId, setDeviceId] = useState(null);
    const [track, setTrack] = useState(null);
    const [paused, setPaused] = useState(true);
    const [volume, setVolume] = useState(50);
    const [position, setPosition] = useState(0);       // ✅ Current playback position
    const [duration, setDuration] = useState(0);       // ✅ Track duration

    const playerRef = useRef(null);
    const scriptLoadedRef = useRef(false);
    const hasConnectedRef = useRef(false);

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


    // ---- Web API Helper ----
    async function webApiCall(path, method = "POST") {
        if (!accessToken) throw new Error("Missing access token");
        const url = `https://api.spotify.com/v1/me/player${path}${deviceId ? `?device_id=${deviceId}` : ""}`;
        const res = await fetch(url, {
            method,
            headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error?.message || "Spotify API error");
        }
        return res;
    }

    // ---- Controls ----
    async function play(uri) {
        if (!uri) return;
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

    async function previousTrack() {
        if (playerRef.current?.previousTrack) return playerRef.current.previousTrack();
        return webApiCall("/previous");
    }

    async function nextTrack() {
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

    return {
        track,
        paused,
        isReady,
        deviceId,
        volume,
        position,     // ✅ current playback position
        duration,     // ✅ track duration
        play,
        togglePlay,
        nextTrack,
        previousTrack,
        changeVolume,
        seek,         // ✅ seek function
        playerRef,    // optional: pass ref to Player component
    };
}
