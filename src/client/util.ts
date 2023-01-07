export const request = <T>(path: string, body: any, cb?: (x: T) => any, err?: () => any) => fetch('/api' + path, {
    method: 'POST',
    headers: {
        authorization: localStorage.getItem('auth')!,
        'content-type': 'application/json',
    },
    body: JSON.stringify(body),
}).then(d => d.json()).then(d => {
    if (!d.error) return cb?.(d);
    else if (err) return err();
    else alert('Error: ' + d.error);
});

export const formatNumber = (n: number) => +n.toFixed(2);

export const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${(s % 60 + '').padStart(2, '0')}`;