import { getLang } from '../../util';
import MatchData from '../components/MatchData';

export default () => {
    try {
        return <>
            <h2>{['Match as guest (unsaved)', 'Meccs vendégként (nem mentve)'][getLang()]}</h2>
            <MatchData data={JSON.parse(new URLSearchParams(window.location.search).get('data')!)}/>
        </>;
    } catch {
        return <h2>{['Invalid data.', 'Érvénytelen adatok.'][getLang()]}</h2>;
    }
};