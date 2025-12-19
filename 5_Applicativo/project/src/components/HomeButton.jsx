export default function HomeButton({ goHome }) {
    return (
        <div
            onClick={goHome}
            style={{
                cursor: "pointer",
                padding: "12px 15px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                color: "white",
                background: "#1a1a1a",
                marginBottom: "15px",
                transition: "0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#2a2a2a")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "#1a1a1a")}
        >
            <span style={{ fontSize: "16px" }}>🏠 Home</span>
        </div>
    );
}
