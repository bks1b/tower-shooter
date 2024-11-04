import { defaultConfig, User } from '../../util';
import { getControls, getLang, getLangPicker, parseAuth, request } from '../util';
import Game from './classes/Game';

const auth = parseAuth();
if (auth) request<User>('/auth/login', auth, u => new Game(u.config));
else new Game(defaultConfig);

window.addEventListener('lang', () => {
    document.getElementById('reset')!.innerHTML = ['Reset', 'Visszaállítás'][getLang()];
    document.getElementById('controls')!.innerHTML = getControls();
    document.getElementById('picker')!.innerHTML = getLangPicker();
    [...document.getElementById('config')!.children].forEach((x, i) => x.children[0].innerHTML = [['Sensitivity', 'Érzékenység'], ['FOV', 'FOV']][i][getLang()] + ':');
});
window.dispatchEvent(new Event('lang'));