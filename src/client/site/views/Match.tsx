import { useContext, useEffect, useState } from 'react';
import { Match } from '../../../util';
import heroes from '../../game/util/heroes';
import { formatSeconds, request } from '../../util';
import Circle from '../components/Circle';
import { formatDate, HERO_KILL_DIAMETER, MainContext, sumValues } from '../util';

export default (props: { name: string; id: string; }) => {
    const { navigate } = useContext(MainContext)!;
    const [data, setData] = useState<[string, Match]>();
    useEffect(() => {
        request<[string, Match]>('/getMatch', props, d => setData(d));
    }, []);
    return data
        ? <>
            <h1 className='link' onClick={() => navigate(['user', data[0]])}>{data[0]}</h1>
            <h3>Match #{props.id}</h3>
            <p>Outcome: {data[1].won ? 'win' : 'loss'}</p>
            <p>Duration: {formatSeconds(Math.round(data[1].duration))}</p>
            <p>Ended at {formatDate(data[1].endDate)}</p>
            <p>{sumValues(data[1].kills)} kills</p>
            {heroes.map((x, i) => <div className='hero' key={i}>
                <Circle diameter={HERO_KILL_DIAMETER} color={x.color}/>
                <div>{data[1].kills[i] || 0} kills</div>
            </div>)}
        </>
        : <></>;
};