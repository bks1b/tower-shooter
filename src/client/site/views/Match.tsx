import { useContext, useEffect, useState } from 'react';
import { Match } from '../../../util';
import { getLang, request } from '../../util';
import { MainContext } from '../util';
import MatchData from '../components/MatchData';

export default (props: { name: string; id: string; }) => {
    const { navigate } = useContext(MainContext)!;
    const [data, setData] = useState<[string, Match]>();
    useEffect(() => {
        request<[string, Match]>('/getMatch', props, d => setData(d));
    }, []);
    return data
        ? <>
            <h1 className='link' onClick={() => navigate(['user', data[0]])}>{data[0]}</h1>
            <h2>{['Match', 'Meccs'][getLang()]} #{props.id}</h2>
            <MatchData data={data[1]}/>
        </>
        : <></>;
};