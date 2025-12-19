import { useState } from "react";

export default function SearchBar({ onSearch }) {
    const [query, setQuery] = useState("");

    function handleSubmit(e) {
        e.preventDefault();
        if (query.trim() !== "") {
            onSearch(query);
        }
    }

    return (
        
        <form onSubmit={handleSubmit} style={{ marginBottom: "20px" }}>
            <input
                type="text"
                placeholder="Search Spotify…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ padding: "10px", width: "250px" }}
            />
            <button type="submit" style={{ padding: "10px 15px", marginLeft: "10px" }}>
                Search
            </button>
        </form>
    );
}
