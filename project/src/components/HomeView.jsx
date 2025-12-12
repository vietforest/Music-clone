export default function HomeView() {
    return (
        <div style={{ padding: "20px", color: "white" }}>
            <h2 style={{ marginBottom: "10px" }}>Home</h2>
            <p style={{ opacity: 0.7 }}>
                Welcome! Search for songs or open a playlist.
            </p>

            <div
                style={{
                    background: "black",
                    borderRadius: "16px",
                    padding: "20px",
                    marginTop: "20px",
                }}
            >
                <h4>Start by selecting a playlist or searching music.</h4>
            </div>
        </div>
    );
}
