import { useContext, useRef, useState } from 'react';
import { User } from '../../../util';
import heroes from '../../game/util/heroes';
import { request } from '../../util';
import Circle from '../components/Circle';
import { MainContext } from '../util';

export default () => {
    const { navigate, user, setUser } = useContext(MainContext)!;
    const [popup, setPopup] = useState<false | 'login' | 'signup' | 'edit'>(false);
    const username = useRef<HTMLInputElement>(null);
    const password = useRef<HTMLInputElement>(null);
    return <>
        {
            popup
                ? <div className='popupContainer' onClick={e => {
                    if ((e.target as HTMLElement).className === 'popupContainer') setPopup(false);
                }}>
                    <div className='popup'>
                        <label>Username: <input ref={username}/></label>
                        <br/>
                        <label>Password: <input type='password' ref={password}/></label>
                        <br/>
                        <button onClick={async () => {
                            const auth = [username.current!.value, password.current!.value];
                            request<User>('/auth/' + popup, auth, u => {
                                localStorage.setItem('auth', JSON.stringify(auth));
                                setUser({ loggedIn: true, auth, name: u.name });
                                setPopup(false);
                            });
                        }}>{popup === 'edit' ? 'Save' : popup === 'login' ? 'Log in' : 'Sign up'}</button>
                    </div>
                </div>
                : ''
        }
        <div className='mainButtons'>{
            user.loggedIn
                ? <>
                    <div><button className='play' onClick={() => window.location.pathname = '/play'}>Play</button></div>
                    <div className='buttons'>
                        <button onClick={() => navigate(['user', user.name!])}>View profile</button>
                        <button onClick={() => setPopup('edit')}>Account settings</button>
                        <button onClick={() => {
                            localStorage.removeItem('auth');
                            setUser({ loggedIn: false });
                        }}>Log out</button>
                    </div>
                </>
                : <>
                    <h2>Log in or sign up to play.</h2>
                    <div className='buttons'>
                        <button onClick={() => setPopup('login')}>Log in</button>
                        <button onClick={() => setPopup('signup')}>Sign up</button>
                    </div>
                </>
        }</div>
        <h2>Game</h2>
        <p>2 teams have 2 small towers and a main tower each. The main tower can only be destroyed after the small towers have been destroyed. The first team to destroy the enemy's main tower wins.</p>
        <h2>Heroes</h2>
        <div className='heroes'>{heroes.map((x, i) => <div key={i}>
            <Circle diameter={120} color={x.color}/>
            <p><b>Weapon type</b>: {x.weapon.type}</p>
            <p>{x.ability ? <><b>Ability</b>: {x.ability.description}</> : <><b>Passive ability</b>: flying</>}</p>
        </div>)}</div>
    </>;
};