import { useContext, useRef, useState } from 'react';
import { User } from '../../../util';
import heroes from '../../game/util/heroes';
import { getControls, getLang, request } from '../../util';
import Circle from '../components/Circle';
import { MainContext } from '../util';
import { ProjectileWeapon } from '../../game/util';

const login = ['Log in', 'Bejelentkezés'];
const signup = ['Sign up', 'Regisztráció'];

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
                        <label>{['Username', 'Név'][getLang()]}: <input ref={username}/></label>
                        <br/>
                        <label>{['Password', 'Jelszó'][getLang()]}: <input type='password' ref={password}/></label>
                        <br/>
                        <button onClick={async () => {
                            const auth = [username.current!.value, password.current!.value];
                            request<User>('/auth/' + popup, auth, u => {
                                localStorage.setItem('auth', JSON.stringify(auth));
                                setUser({ loggedIn: true, auth, name: u.name });
                                setPopup(false);
                            });
                        }}>{(popup === 'edit' ? ['Save', 'Mentés'] : popup === 'login' ? login : signup)[getLang()]}</button>
                    </div>
                </div>
                : ''
        }
        <div className='mainButtons'>
            <div><button className='play' onClick={() => window.location.pathname = '/play'}>{['Play', 'Játék'][getLang()]}{user.loggedIn ? '' : [' as guest', ' vendégként'][getLang()]}</button></div>
            <div className='buttons'>{
                (user.loggedIn
                    ? [
                        [() => navigate(['user', user.name!]), ['View profile', 'Profil']],
                        [() => setPopup('edit'), ['Account settings', 'Beállítások']],
                        [() => {
                            localStorage.removeItem('auth');
                            setUser({ loggedIn: false });
                        }, ['Log out', 'Kijelentkezés']],
                    ] as const
                    : [
                        [() => setPopup('login'), login],
                        [() => setPopup('signup'), signup],
                    ] as const).map((x, i) => <button key={i} onClick={x[0]}>{x[1][getLang()]}</button>)
            }</div>
        </div>
        <h1>{['Game', 'Játék'][getLang()]}</h1>
        {[
            [
                '2 teams have 2 small towers and a main tower each. The main tower can only be attacked after the small towers have been destroyed. The first team to destroy the enemy\'s main tower wins.',
                '2 csapat játszik egymás ellen. Mindkét csapatnak van 2 kis tornya és 1 nagy tornya. A nagy tornyot csak azután lehet támadni, miután a kis tornyok le lettek rombolva. Az a csapat nyer, amelyik először lerombolja az ellenfél nagy tornyát.',
            ],
            [
                'Both teams consist of 5 heroes, each with a different color and ability. One team consists of robots only, the other one consists of 4 robots and 1 hero is controlled by the player. The player can switch between available heroes anytime.',
                'Mindkét csapatban 5 különböző színű hős van, mindegyiknek más a képessége. Az egyik csapatban robotok játszanak, a másik csapatban 4 robot játszik és 1 hőst a felhasználó irányít. A felhasználó bármikor válthat az élő hősök között.',
            ],
            [
                'Attacking enemy heroes helps defend the towers. If a hero runs out of health points or falls off the map, it respawns after 10 seconds.',
                'Az ellenfél hőseinek támadásával lehet védeni a tornyokat. Ha egy hősnek elfogynak az életpontjai vagy kiesik a pályáról, 10 másodperc múlva éled újra.',
            ],
            [
                'The towers can be attacked by shooting the red circles inside. If a tower\'s health points don\'t appear above its circle, it has been destroyed.',
                'A tornyokat a bennük lévő piros kör lövésével lehet támadni. Ha egy toronyban lévő kör felett nincsenek életpontok, akkor le lett rombolva.',
            ],
        ].map((x, i) => <p key={i}>{x[getLang()]}</p>)}
        <h1>{['Heroes', 'Hősök'][getLang()]}</h1>
        <div className='heroes'>{heroes.map((x, i) => <div key={i}>
            <Circle diameter={120} color={x.color}/>
            <p><b>{['Weapon type', 'Fegyver'][getLang()]}</b>: {[x.weapon.type, { hitscan: 'sugár', projectile: 'lövedék' }[x.weapon.type]][getLang()]}</p>
            <p><b>{['Ability', 'Képesség'][getLang()]}</b>: {(x.ability?.description || x.passive!)[getLang()]}</p>
            {(x.weapon as ProjectileWeapon).knockback ? <p><b>{['Other', 'Egyéb'][getLang()]}</b>: {['knockback', 'visszalökés'][getLang()]}</p> : ''}
        </div>)}</div>
        <h1>{['Controls', 'Irányítás'][getLang()]}</h1>
        <div dangerouslySetInnerHTML={{ __html: getControls() }}/>
    </>;
};