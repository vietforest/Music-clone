export default function OAuthInfo({ token }) {
    if (!token) return null;

    return (
        <div>
            <h2>OAuth Info</h2>
            <table>
                <tbody>
                <tr><td>Access Token</td><td>{token.access_token}</td></tr>
                <tr><td>Refresh Token</td><td>{token.refresh_token}</td></tr>
                <tr><td>Expires At</td><td>{token.expires?.toString()}</td></tr>
                </tbody>
            </table>
        </div>
    );
}

