import { useEffect, useState, useRef } from "react";

const clientId = "e6397628a2d64070a7a9392d958afdb4";
const redirectUrl = "http://127.0.0.1:3000";
const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const scope = "user-read-private user-read-email streaming user-read-playback-state user-modify-playback-state user-read-recently-played";

export default function useSpotifyAuth() {
    const [loading, setLoading] = useState(true);
    const [token, setToken] = useState(() => {
        const access = localStorage.getItem("access_token");
        const refresh = localStorage.getItem("refresh_token");
        const expires_in = localStorage.getItem("expires_in");
        const expires = localStorage.getItem("expires");
        if (!access) return null;
        return { access_token: access, refresh_token: refresh, expires_in, expires };
    });
    const [user, setUser] = useState(null);

    // ---------------------------
    // Caching to prevent flicker
    // ---------------------------
    const playlistsCache = useRef([]);
    const recentTracksCache = useRef([]);

    // ---------------------------
    // Save token to state & localStorage
    // ---------------------------
    const saveToken = (data) => {
        const { access_token, refresh_token, expires_in } = data;
        const expires = new Date(Date.now() + expires_in * 1000).toISOString();

        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", refresh_token);
        localStorage.setItem("expires_in", expires_in);
        localStorage.setItem("expires", expires);

        setToken({ access_token, refresh_token, expires_in, expires });
    };

    // ---------------------------
    // PKCE login
    // ---------------------------
    async function login() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const randomValues = crypto.getRandomValues(new Uint8Array(64));
        const code_verifier = [...randomValues].map(x => chars[x % chars.length]).join("");

        const hashed = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code_verifier));
        const code_challenge = btoa(String.fromCharCode(...new Uint8Array(hashed)))
            .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

        localStorage.setItem("code_verifier", code_verifier);

        const authUrl = new URL(authorizationEndpoint);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("client_id", clientId);
        authUrl.searchParams.set("scope", scope);
        authUrl.searchParams.set("redirect_uri", redirectUrl);
        authUrl.searchParams.set("code_challenge_method", "S256");
        authUrl.searchParams.set("code_challenge", code_challenge);

        window.location.href = authUrl.toString();
    }

    // ---------------------------
    // Exchange code for token
    // ---------------------------
    async function exchangeToken(code) {
        const verifier = localStorage.getItem("code_verifier");
        const res = await fetch(tokenEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: clientId,
                grant_type: "authorization_code",
                redirect_uri: redirectUrl,
                code_verifier: verifier,
                code,
            }),
        });
        return res.json();
    }

    // ---------------------------
    // Refresh token
    // ---------------------------
    async function refresh() {
        if (!token?.refresh_token) return;

        const res = await fetch(tokenEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: clientId,
                grant_type: "refresh_token",
                refresh_token: token.refresh_token,
            }),
        });

        const data = await res.json();
        if (data.access_token) saveToken(data);
    }

    // ---------------------------
    // Logout
    // ---------------------------
    function logout() {
        localStorage.clear();
        setToken(null);
        setUser(null);
        playlistsCache.current = [];
        recentTracksCache.current = [];
    }

    // ---------------------------
    // Helper: fetch with retry for 429
    // ---------------------------
    async function fetchWithRetry(url, options = {}) {
        const res = await fetch(url, options);
        if (res.status === 429) {
            const retryAfter = parseInt(res.headers.get("Retry-After") || "1", 10) * 1000;
            console.warn(`Rate limited. Retrying after ${retryAfter}ms...`);
            await new Promise(r => setTimeout(r, retryAfter));
            return fetchWithRetry(url, options);
        }
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error?.message || "Spotify API error");
        }
        return res.json();
    }

    // ---------------------------
    // Search tracks
    // ---------------------------
    async function searchSpotify(query, type = "track") {
        if (!token?.access_token || !query) return [];
        const data = await fetchWithRetry(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=10`,
            { headers: { Authorization: `Bearer ${token.access_token}` } }
        );
        return data;
    }

    // ---------------------------
    // Playlists
    // ---------------------------
    async function getUserPlaylists() {
        if (playlistsCache.current.length) return playlistsCache.current;

        if (!token?.access_token) return [];
        const data = await fetchWithRetry("https://api.spotify.com/v1/me/playlists", {
            headers: { Authorization: `Bearer ${token.access_token}` },
        });
        playlistsCache.current = data.items || [];
        return playlistsCache.current;
    }

    async function getPlaylistTracks(playlistId) {
        if (!token?.access_token) return [];
        const data = await fetchWithRetry(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            headers: { Authorization: `Bearer ${token.access_token}` },
        });
        return data.items.map(i => i.track).filter(Boolean);
    }

    // ---------------------------
    // Recently played tracks
    // ---------------------------
    async function getRecentlyPlayed() {
        if (recentTracksCache.current.length) return recentTracksCache.current;

        if (!token?.access_token) return [];
        const data = await fetchWithRetry(`https://api.spotify.com/v1/me/player/recently-played?limit=20`, {
            headers: { Authorization: `Bearer ${token.access_token}` },
        });
        const tracks = data.items.map(i => i.track).filter(Boolean);
        recentTracksCache.current = tracks;
        return tracks;
    }

    // ---------------------------
    // OAuth redirect handling
    // ---------------------------
    useEffect(() => {
        let isMounted = true;

        async function handleRedirect() {
            const params = new URLSearchParams(window.location.search);
            const code = params.get("code");

            if (!code) {
                if (isMounted) setLoading(false);
                return;
            }

            try {
                const data = await exchangeToken(code);
                if (isMounted && data.access_token) saveToken(data);
                window.history.replaceState({}, "", window.location.pathname);
            } finally {
                if (isMounted) setLoading(false);
            }
        }

        handleRedirect();
        return () => { isMounted = false; };
    }, []);

    // ---------------------------
    // Load Spotify user
    // ---------------------------
    useEffect(() => {
        let isMounted = true;
        async function loadUser() {
            if (!token?.access_token) {
                if (isMounted) setLoading(false);
                return;
            }
            try {
                const data = await fetchWithRetry("https://api.spotify.com/v1/me", {
                    headers: { Authorization: `Bearer ${token.access_token}` },
                });
                if (isMounted) setUser(data);
            } finally {
                if (isMounted) setLoading(false);
            }
        }
        loadUser();
        return () => { isMounted = false; };
    }, [token?.access_token]);

    return {
        loading,
        token,
        user,
        login,
        refresh,
        logout,
        searchSpotify,
        getUserPlaylists,
        getPlaylistTracks,
        getRecentlyPlayed,
    };
}
