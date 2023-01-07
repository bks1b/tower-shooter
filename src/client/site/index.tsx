import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { User as UserType } from '../../util';
import { request } from '../util';
import { AuthData, MainContext } from './util';
import Home from './views/Home';
import Match from './views/Match';
import User from './views/User';

const getPath = () => decodeURIComponent(window.location.pathname).split('/').slice(1).filter(x => x);

const App = () => {
    const navigate = (arr: string[]) => {
        window.history.pushState('', '', '/' + arr.map(x => encodeURIComponent(x)).join('/'));
        setPath(arr);
    };
    const [path, setPath] = useState(getPath());
    const [wait, setWait] = useState(!!localStorage.getItem('auth'));
    const [user, setUser] = useState<AuthData>({ loggedIn: false });
    useEffect(() => {
        window.onpopstate = () => setPath(getPath());
        try {
            const auth = JSON.parse(localStorage.getItem('auth')!);
            if (auth) request<UserType>('/auth/login', auth, u => setUser({ loggedIn: true, auth, name: u.name }), () => localStorage.removeItem('auth')).finally(() => setWait(false));
        } catch {
            setWait(false);
        }
    }, []);
    return wait
        ? <></>
        : <MainContext.Provider value={{ navigate, user, setUser }}>
            {path.length ? <p className='link home' onClick={() => navigate([])}>Homepage</p> : ''}
            {
                (path[0] === 'user'
                    ? path.length === 3
                        ? <Match name={path[1]} id={path[2]}/>
                        : path.length === 2
                            ? <User name={path[1]}/>
                            : false
                    : path.length
                        ? false
                        : <Home/>) || <h1>Page not found.</h1>
            }
        </MainContext.Provider>;
};

createRoot(document.getElementById('root')!).render(<App/>);