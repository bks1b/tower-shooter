export default ({ diameter, color }: { diameter: number; color: string; }) => <div style={{
    borderRadius: '50%',
    width: diameter + 'px',
    height: diameter + 'px',
    backgroundColor: color,
}}>&nbsp;</div>;