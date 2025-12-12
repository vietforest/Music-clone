export default function Login({ login }) {
    return (
        <div>
            <h1>Welcome to the OAuth2 PKCE Example</h1>
            <button onClick={login}>Log in with Spotify</button>
        </div>
    );
}

