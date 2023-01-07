import { User } from '../../util';
import { request } from '../util';
import Game from './classes/Game';

try {
    const auth = JSON.parse(localStorage.getItem('auth')!);
    request<User>('/auth/login', auth, u => new Game(u.config), () => window.location.pathname = '/');
} catch {
    window.location.pathname = '/';
}