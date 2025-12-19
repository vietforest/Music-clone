export default function LoggedIn({ user, refresh, logout }) {
    if (!user) return <div>Loading profile…</div>;

    return (
        <div>
            <h1>Logged in as {user.display_name}</h1>

            {user.images?.[0] && (
                <img width="150" src={user.images[0].url} alt={user.display_name} />
            )}

            <table>
                <tbody>
                <tr><td>Display name</td><td>{user.display_name}</td></tr>
                <tr><td>Id</td><td>{user.id}</td></tr>
                <tr><td>Email</td><td>{user.email}</td></tr>
                <tr>
                    <td>Spotify URI</td>
                    <td>
                        <a href={user.external_urls?.spotify}>
                            {user.external_urls?.spotify}
                        </a>
                    </td>
                </tr>
                <tr>
                    <td>Link</td>
                    <td><a href={user.href}>{user.href}</a></td>
                </tr>
                <tr>
                    <td>Profile Image</td>
                    <td>
                        <a href={user.images?.[0]?.url}>{user.images?.[0]?.url}</a>
                    </td>
                </tr>
                <tr><td>Country</td><td>{user.country}</td></tr>
                </tbody>
            </table>

            <button onClick={refresh}>Refresh Token</button>
            <button onClick={logout}>Log out</button>
        </div>
    );
}

