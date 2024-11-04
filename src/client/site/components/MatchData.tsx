import { Match } from '../../../util';
import heroes from '../../game/util/heroes';
import { formatSeconds, getKills, getLang, getOutcome } from '../../util';
import { formatDate, HERO_KILL_DIAMETER, sumValues } from '../util';
import Circle from './Circle';

export default ({ data }: { data: Match; }) => <>
    {[
        [['Outcome', 'Eredmény'], getOutcome(data.won)],
        [['Duration', 'Hossz'], formatSeconds(Math.round(data.duration))],
        [['Ended at', 'Vége'], formatDate(data.endDate)],
    ].map((x, i) => <p key={i}>{x[0][getLang()]}: {x[1]}</p>)}
    <p>{getKills(sumValues(data.kills))}</p>
    {heroes.map((x, i) => <div className='hero' key={i}>
        <Circle diameter={HERO_KILL_DIAMETER} color={x.color}/>
        <div>{getKills(data.kills[i] || 0)}</div>
    </div>)}
</>;