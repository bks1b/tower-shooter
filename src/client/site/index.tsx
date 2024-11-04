import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { User as UserType } from '../../util';
import { getAuth, getLang, getLangPicker, parseAuth, request } from '../util';
import { AuthData, MainContext } from './util';
import Home from './views/Home';
import Match from './views/Match';
import User from './views/User';
import UnsavedMatch from './views/UnsavedMatch';

const getPath = () => decodeURIComponent(window.location.pathname).split('/').slice(1).filter(x => x);

const App = () => {
    const navigate = (arr: string[]) => {
        window.history.pushState('', '', '/' + arr.map(x => encodeURIComponent(x)).join('/'));
        setPath(arr);
    };
    const [path, setPath] = useState(getPath());
    const [wait, setWait] = useState(!!getAuth());
    const [user, setUser] = useState<AuthData>({ loggedIn: false });
    const [, setUpdate] = useState(0);
    useEffect(() => {
        window.onpopstate = () => setPath(getPath());
        try {
            const auth = parseAuth();
            if (auth) request<UserType>('/auth/login', auth, u => setUser({ loggedIn: true, auth, name: u.name }), () => localStorage.removeItem('auth')).finally(() => setWait(false));
        } catch {
            setWait(false);
        }
        window.addEventListener('lang', () => setUpdate(Date.now()));
    }, []);
    return wait
        ? <></>
        : <MainContext.Provider value={{ navigate, user, setUser }}>
            <div className='langPicker' dangerouslySetInnerHTML={{ __html: getLangPicker() }}/>
            {path.length ? <p className='link home' onClick={() => navigate([])}>{['Homepage', 'Főoldal'][getLang()]}</p> : ''}
            {
                (path[0] === 'user'
                    ? path.length === 3
                        ? <Match name={path[1]} id={path[2]}/>
                        : path.length === 2 && <User name={path[1]}/>
                    : path[0] === 'match'
                        ? <UnsavedMatch/>
                        : !path.length && <Home/>) || <h1>{['Page not found.', 'Az oldal nem található.'][getLang()]}</h1>
            }
        </MainContext.Provider>;
};

if (!localStorage.getItem('lang') && [...navigator.languages || [], navigator.language].includes('hu-HU')) localStorage.setItem('lang', '1');

createRoot(document.getElementById('root')!).render(<App/>);