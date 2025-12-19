import { useEffect, useState, useRef } from "react";

const clientId = "e6397628a2d64070a7a9392d958afdb4";
const redirectUrl = "http://127.0.0.1:3000";
const authorizationEndpoint = "https://accounts.spotify.com/authorize";
const tokenEndpoint = "https://accounts.spotify.com/api/token";
const scope = "user-read-private user-read-email streaming user-read-playback-state user-modify-playback-state user-read-recently-played playlist-modify-public playlist-modify-private playlist-read-private playlist-read-collaborative";

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
    // Caching to prevent flicker and reduce API calls
    // ---------------------------
    const playlistsCache = useRef([]);
    const recentTracksCache = useRef([]);
    const featuredPlaylistsCache = useRef(null); // null = not loaded yet, [] = loaded but empty
    const newReleasesCache = useRef(null); 
    const recentAlbumsCache = useRef([]);

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
        playlistsCache.current = [];
        recentTracksCache.current = [];
        featuredPlaylistsCache.current = null;
        newReleasesCache.current = null;
        recentAlbumsCache.current = [];
        playlistTracksCache.current = {};
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

    
    async function searchSpotify(query, type = "track") {
        if (!token?.access_token || !query) return [];
        const data = await fetchWithRetry(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${type}&limit=10`,
            { headers: { Authorization: `Bearer ${token.access_token}` } }
        );
        return data;
    }

    
    async function getUserPlaylists() {
        if (playlistsCache.current.length) return playlistsCache.current;

        if (!token?.access_token) return [];
        const data = await fetchWithRetry("https://api.spotify.com/v1/me/playlists", {
            headers: { Authorization: `Bearer ${token.access_token}` },
        });
        playlistsCache.current = data.items || [];
        return playlistsCache.current;
    }

 
    const playlistTracksCache = useRef({});
    
    async function getPlaylistTracks(playlistId, forceRefresh = false) {
        if (!token?.access_token) return [];
        
        // Return cached data if available and not forcing refresh
        if (!forceRefresh && playlistTracksCache.current[playlistId]) {
            return playlistTracksCache.current[playlistId];
        }
        
        const data = await fetchWithRetry(`https://api.spotify.com/v1/playlists/${playlistId}/tracks`, {
            headers: { Authorization: `Bearer ${token.access_token}` },
        });
        const tracks = data.items.map(i => i.track).filter(Boolean);
        playlistTracksCache.current[playlistId] = tracks;
        return tracks;
    }

    // ---------------------------
    // Create playlist (always private)
    // ---------------------------
    async function createPlaylist(name, description = "") {
        if (!token?.access_token || !user?.id) return null;
        
        try {
            const data = await fetchWithRetry(
                `https://api.spotify.com/v1/users/${user.id}/playlists`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token.access_token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name,
                        description,
                        public: false, // Always create private playlists
                    }),
                }
            );
            // Clear cache to force refresh
            playlistsCache.current = [];
            return data;
        } catch (error) {
            console.error("Error creating playlist:", error);
            throw error;
        }
    }

    
    async function deletePlaylist(playlistId) {
        if (!token?.access_token) return false;
        
        try {
            const response = await fetch(
                `https://api.spotify.com/v1/playlists/${playlistId}/followers`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${token.access_token}` },
                }
            );
            
            if (!response.ok && response.status !== 204) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error?.message || "Failed to delete playlist");
            }
            
            // Clear cache to force refresh
            playlistsCache.current = [];
            return true;
        } catch (error) {
            console.error("Error deleting playlist:", error);
            throw error;
        }
    }

    
    async function addTracksToPlaylist(playlistId, trackUris) {
        if (!token?.access_token || !trackUris || trackUris.length === 0) return false;
        
        try {
            // Spotify API accepts up to 100 tracks at once
            const uris = Array.isArray(trackUris) ? trackUris : [trackUris];
            const data = await fetchWithRetry(
                `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token.access_token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        uris: uris,
                    }),
                }
            );
            // Clear cache for this playlist to force refresh
            delete playlistTracksCache.current[playlistId];
            return true;
        } catch (error) {
            console.error("Error adding tracks to playlist:", error);
            throw error;
        }
    }

   
    async function removeTracksFromPlaylist(playlistId, trackUris) {
        if (!token?.access_token || !trackUris || trackUris.length === 0) return false;
        
        try {
            // Spotify API requires track objects with uri
            const uris = Array.isArray(trackUris) ? trackUris : [trackUris];
            const tracks = uris.map(uri => ({ uri }));
            
            const data = await fetchWithRetry(
                `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token.access_token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        tracks: tracks,
                    }),
                }
            );
            // Clear cache for this playlist to force refresh
            delete playlistTracksCache.current[playlistId];
            return true;
        } catch (error) {
            console.error("Error removing tracks from playlist:", error);
            throw error;
        }
    }

   
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

    
    async function getFeaturedPlaylists() {
        // Return cached data if available (including empty array to prevent retries)
        if (featuredPlaylistsCache.current !== null) return featuredPlaylistsCache.current;
        
        if (!token?.access_token) {
            featuredPlaylistsCache.current = [];
            return [];
        }
        
        try {
            // Use user's own playlists as featured content
            const userPlaylists = await getUserPlaylists();
            // Cache the result (even if empty)
            featuredPlaylistsCache.current = userPlaylists.slice(0, 20);
            return featuredPlaylistsCache.current;
        } catch (error) {
            console.warn("Error fetching featured playlists:", error);
            // Cache empty array to prevent retries
            featuredPlaylistsCache.current = [];
            return [];
        }
    }

    
    async function getNewReleases() {
        // Return cached data if available (including null check to prevent retries)
        if (newReleasesCache.current !== null) return newReleasesCache.current;
        
        if (!token?.access_token) {
            newReleasesCache.current = [];
            return [];
        }
        
        try {
            const data = await fetchWithRetry("https://api.spotify.com/v1/browse/new-releases?limit=20", {
                headers: { Authorization: `Bearer ${token.access_token}` },
            });
            const albums = data.albums?.items || [];
            // Cache the result (even if empty)
            newReleasesCache.current = albums;
            return albums;
        } catch (error) {
            console.warn("Error fetching new releases:", error);
            // Cache empty array to prevent retries
            newReleasesCache.current = [];
            return [];
        }
    }

    
    async function getAlbumTracks(albumId) {
        if (!token?.access_token) return [];
        try {
            const data = await fetchWithRetry(`https://api.spotify.com/v1/albums/${albumId}/tracks`, {
                headers: { Authorization: `Bearer ${token.access_token}` },
            });
            // Album tracks API returns simplified track objects, need to fetch full track details
            const trackIds = data.items.map(item => item.id).filter(Boolean);
            if (trackIds.length === 0) return [];
            
            // Fetch full track details
            const tracksData = await fetchWithRetry(
                `https://api.spotify.com/v1/tracks?ids=${trackIds.join(",")}`,
                { headers: { Authorization: `Bearer ${token.access_token}` } }
            );
            return tracksData.tracks || [];
        } catch (error) {
            console.warn("Error fetching album tracks:", error);
            return [];
        }
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
        createPlaylist,
        deletePlaylist,
        addTracksToPlaylist,
        removeTracksFromPlaylist,
        getAlbumTracks,
        getRecentlyPlayed,
        getFeaturedPlaylists,
        getNewReleases,
    };
}
