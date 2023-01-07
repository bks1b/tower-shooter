import { useContext, useEffect, useState } from 'react';
import { Match } from '../../../util';
import heroes from '../../game/util/heroes';
import { formatNumber, formatSeconds, request } from '../../util';
import Circle from '../components/Circle';
import { formatDate, HERO_KILL_DIAMETER, MainContext, sumValues } from '../util';

export default (props: { name: string; }) => {
    const { navigate } = useContext(MainContext)!;
    const [data, setData] = useState<[string, Match[]]>();
    useEffect(() => {
        request<[string, Match[]]>('/getUser', props, d => setData(d));
    }, []);
    return data
        ? <>
            <h1>{data[0]}</h1>
            {
                data[1].length
                    ? (() => {
                        const wins = data[1].filter(x => x.won).length;
                        const losses = data[1].length - wins;
                        const kills = data[1].reduce((a, b) => {
                            Object.entries(b.kills).forEach(x => a[x[0]] = (a[x[0]] || 0) + x[1]);
                            return a;
                        }, {} as Record<string, number>);
                        const killCount = sumValues(kills);
                        return <>
                            <p>{wins} wins</p>
                            <p>{losses} losses</p>
                            {losses ? <p>Win/lose ratio: {formatNumber(wins / losses)}</p> : ''}
                            <p>Winrate: {formatNumber(wins / data[1].length * 100)}%</p>
                            <p>Average match duration: {formatSeconds(Math.round(data[1].reduce((a, b) => a + b.duration, 0) / data[1].length))}</p>
                            <p>{killCount} kills</p>
                            <p>{formatNumber(killCount / data[1].length)} average kills</p>
                            {heroes.map((x, i) => <div className='hero' key={i}>
                                <Circle diameter={HERO_KILL_DIAMETER} color={x.color}/>
                                <div>
                                    <p>{kills[i] || 0} kills</p>
                                    <p>{formatNumber((kills[i] || 0) / data[1].length)} average kills</p>
                                </div>
                            </div>)}
                            <h3>Match history</h3>
                            <ul>{
                                [...data[1]]
                                    .reverse()
                                    .map((x, i) => <li key={i} className='link' onClick={() => navigate(['user', props.name, data[1].length - i + ''])}>{formatDate(x.endDate)}: {x.won ? 'win' : 'loss'}, {sumValues(x.kills)} kills</li>)
                            }</ul>
                        </>;
                    })()
                    : <p>No matches yet.</p>
            }
        </>
        : <></>;
};