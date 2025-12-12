// useSpotifyAuth.js
import { useState, useEffect, useRef } from "react";

const clientId = "e6397628a2d64070a7a9392d958afdb4";
const redirectUrl = "http://127.0.0.1:3000";

const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const API_BASE = "https://api.spotify.com/v1";

const scope = [
    "user-read-private",
    "user-read-email",
    "streaming",
    "user-read-playback-state",
    "user-modify-playback-state",
    "user-read-recently-played",
    "playlist-read-private",
    "playlist-read-collaborative",
    "playlist-modify-public",
    "playlist-modify-private"
].join(" ");

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

    const playlistsCache = useRef({});
    const recentTracksCache = useRef([]);

    // Save token
    const saveToken = (data) => {
        const { access_token, refresh_token, expires_in } = data;
        const expires = new Date(Date.now() + expires_in * 1000).toISOString();

        localStorage.setItem("access_token", access_token);
        localStorage.setItem("refresh_token", refresh_token);
        localStorage.setItem("expires_in", expires_in);
        localStorage.setItem("expires", expires);

        setToken({ access_token, refresh_token, expires_in, expires });
    };

    // PKCE login
    async function login() {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        const randomValues = crypto.getRandomValues(new Uint8Array(64));
        const code_verifier = [...randomValues].map(x => chars[x % chars.length]).join("");

        const hashBuffer = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code_verifier));
        const code_challenge = btoa(String.fromCharCode(...new Uint8Array(hashBuffer)))
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

    function logout() {
        localStorage.clear();
        setToken(null);
        setUser(null);
        playlistsCache.current = {};
        recentTracksCache.current = [];
    }

    // ---------------------------
    // Simple fetch (no retry)
    // ---------------------------
    async function simpleFetch(url, options = {}) {
        const res = await fetch(url, options);
        if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error?.message || "Spotify API error");
        }
        return res.json();
    }

    // ---------------------------
    // PLAYLISTS — always fetch fresh (no forceRefresh argument)
    // ---------------------------
    async function getUserPlaylists() {
        if (!token?.access_token) return [];

        const data = await simpleFetch(`${API_BASE}/me/playlists?limit=50`, {
            headers: { Authorization: `Bearer ${token.access_token}` },
        });

        return data.items || [];
    }

    async function getPlaylistTracks(playlistId) {
        if (!token?.access_token) return [];

        const data = await simpleFetch(`${API_BASE}/playlists/${playlistId}/tracks`, {
            headers: { Authorization: `Bearer ${token.access_token}` },
        });

        return data.items.map(i => i.track).filter(Boolean);
    }

    async function addTracksToPlaylist(playlistId, trackUri) {
        if (!token?.access_token) throw new Error("Missing access token");

        const res = await fetch(`${API_BASE}/playlists/${playlistId}/tracks`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token.access_token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ uris: [trackUri] }),
        });

        if (!res.ok) throw new Error("Failed to add track");
    }

    async function createPlaylist(name, isPublic = false) {
        if (!token?.access_token || !user?.id) throw new Error("Missing auth or user info");

        return simpleFetch(`${API_BASE}/users/${user.id}/playlists`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token.access_token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ name, public: isPublic }),
        });
    }

    async function deletePlaylist(playlistId) {
        if (!token?.access_token) throw new Error("Missing access token");

        const res = await fetch(`${API_BASE}/playlists/${playlistId}/followers`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token.access_token}` },
        });

        if (!res.ok) throw new Error("Failed to delete playlist");
    }

    // RECENTLY PLAYED
    async function getRecentlyPlayed() {
        if (!token?.access_token) return [];

        const data = await simpleFetch(`${API_BASE}/me/player/recently-played?limit=50`, {
            headers: { Authorization: `Bearer ${token.access_token}` },
        });

        return data.items.map(i => i.track).filter(Boolean);
    }

    // Redirect handling
    useEffect(() => {
        let mounted = true;

        async function handleRedirect() {
            const params = new URLSearchParams(window.location.search);
            const code = params.get("code");

            if (!code) {
                if (mounted) setLoading(false);
                return;
            }

            const data = await exchangeToken(code);
            if (mounted && data.access_token) saveToken(data);

            window.history.replaceState({}, "", window.location.pathname);
            if (mounted) setLoading(false);
        }

        handleRedirect();
        return () => (mounted = false);
    }, []);

    // Load user
    useEffect(() => {
        let mounted = true;

        async function loadUser() {
            if (!token?.access_token) {
                if (mounted) setLoading(false);
                return;
            }

            const data = await simpleFetch(`${API_BASE}/me`, {
                headers: { Authorization: `Bearer ${token.access_token}` },
            });

            if (mounted) setUser(data);
            if (mounted) setLoading(false);
        }

        loadUser();
        return () => (mounted = false);
    }, [token?.access_token]);

    // Search
    async function searchSpotify(query, type = "track") {
        if (!token?.access_token) return [];

        return simpleFetch(
            `${API_BASE}/search?q=${encodeURIComponent(query)}&type=${type}&limit=10`,
            { headers: { Authorization: `Bearer ${token.access_token}` } }
        );
    }

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
        addTracksToPlaylist,
        createPlaylist,
        deletePlaylist,
    };
}
