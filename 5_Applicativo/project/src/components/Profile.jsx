export default function Profile({ user, refresh, logout }) {
    if (!user) return <div>Loading profile…</div>;

    return (
        <div className="d-flex">
                <button type="button" className="btn btn-success dropdown-toggle" id="timezoneDropdown"
                        data-bs-toggle="dropdown"
                        aria-expanded="false">
                    Profile
                </button>
                <ul className="dropdown-menu" aria-labelledby="timezoneDropdown">
                    <li className="active">
                        {user.images?.[0] && <img src={user.images[0].url} alt={user.display_name} />}
                        <div className="meta">
                            <div className="name">{user.display_name}</div>
                        </div>
                    </li>
                    <li>
                        <button className="dropdown-item" onClick={refresh}>Refresh Token</button>
                    </li>
                    <li>
                        <button className="dropdown-item" onClick={logout}>Log out</button>
                    </li>
                    
                </ul>
        </div>

    );
}


