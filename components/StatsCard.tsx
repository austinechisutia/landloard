interface StatsCardProps {
  title: string;
  value: string | number;
  sub?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow';
}

const styles = {
  blue:   'bg-blue-50   border-blue-100   text-blue-800',
  green:  'bg-green-50  border-green-100  text-green-800',
  red:    'bg-red-50    border-red-100    text-red-800',
  yellow: 'bg-yellow-50 border-yellow-100 text-yellow-800',
};

export default function StatsCard({ title, value, sub, color = 'blue' }: StatsCardProps) {
  return (
    <div className={`rounded-xl border p-6 ${styles[color]}`}>
      <p className="text-sm font-medium opacity-75">{title}</p>
      <p className="text-3xl font-bold mt-1 tracking-tight">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}
