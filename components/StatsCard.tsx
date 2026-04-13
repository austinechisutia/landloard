interface StatsCardProps {
  title: string;
  value: string | number;
  sub?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow';
}

const styles = {
  blue:   'bg-white/80 border-[#11430F]/10 text-[#11430F]',
  green:  'bg-[#eef8cf] border-[#d8eba4] text-[#11430F]',
  red:    'bg-[#fff2ed] border-[#f3c9bc] text-[#8a2d1a]',
  yellow: 'bg-[#fbf4d8] border-[#eedfa1] text-[#775d05]',
};

export default function StatsCard({ title, value, sub, color = 'blue' }: StatsCardProps) {
  return (
    <div className={`rounded-[1.5rem] border p-6 shadow-sm backdrop-blur-sm ${styles[color]}`}>
      <p className="text-sm font-medium opacity-75">{title}</p>
      <p className="text-3xl font-bold mt-1 tracking-tight">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}
