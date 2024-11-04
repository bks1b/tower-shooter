export const request = <T>(path: string, body: any, cb?: (x: T) => any, err?: () => any) => fetch('/api' + path, {
    method: 'POST',
    headers: {
        authorization: getAuth()!,
        'content-type': 'application/json',
    },
    body: JSON.stringify(body),
}).then(d => d.json()).then(d => {
    if (!d.error) cb?.(d);
    else if (err) err();
    else alert('Error: ' + d.error);
});

export const getAuth = () => localStorage.getItem('auth');
export const parseAuth = () => {
    try {
        return JSON.parse(getAuth()!);
    } catch {}
};

export const getLangPicker = () => `<label>${['Language', 'Nyelv'][getLang()]}: <select onChange="localStorage.setItem('lang', this.selectedIndex); window.dispatchEvent(new Event('lang'));">${['english', 'magyar'].map((s, i) => `<option${getLang() === i ? ' selected' : ''}>${s}</option>`).join('')}</select></label>`;
export const getControls = () => [
    [['Movement', 'Mozgás'], ['WASD', ['arrow keys', 'nyilak']]],
    [['Jump', 'Ugrás'], ['space']],
    [['Use ability', 'Képesség'], ['E']],
    [['Shoot', 'Lövés'], [['left click', 'bal egérgomb']]],
    [['Switch hero', 'Hős váltás'], [['number keys', 'számok']]],
].map(x => `<p>${x[0][getLang()]}: ${x[1].map(s => `<b>${typeof s === 'string' ? s : s[getLang()]}</b>`).join(', ')}</p>`).join('');

export const getLang = () => +localStorage.getItem('lang')! || 0;
export const getPlural = (n: number, a: string[]) => `${n} ${[a[0] + (n === 1 ? '' : (a[0].endsWith('s') ? 'e' : '') + 's'), a[1]][getLang()]}`;
export const getKills = (n: number) => getPlural(n, ['kill', 'ölés']);
export const getAvgKills = (n: number) => getPlural(formatNumber(n), ['average kill', 'átlag ölés']);
export const getOutcome = (b: boolean) => (b ? ['win', 'győzelem'] : ['loss', 'vereség'])[getLang()];

export const formatNumber = (n: number) => +n.toFixed(2);
export const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${(s % 60 + '').padStart(2, '0')}`;