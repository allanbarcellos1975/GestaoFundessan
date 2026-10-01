import ConfiguracaoIconCard from './ConfiguracaoIconCard';

export default function ConfiguracaoIconGrid({ items = [] }) {
  return (
    <div className="configuration-grid">
      {items.map((item) => (
        <ConfiguracaoIconCard key={item.path} item={item} />
      ))}
    </div>
  );
}
