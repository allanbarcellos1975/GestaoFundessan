import { Link } from 'react-router-dom';

export default function ConfiguracaoIconCard({ item }) {
  const Icon = item.icon;

  return (
    <Link to={item.path} className="configuration-card">
      <div className="configuration-card-icon" aria-hidden="true">
        {Icon ? <Icon size={22} strokeWidth={2} /> : item.label?.slice(0, 1)}
      </div>

      <div className="configuration-card-copy">
        <h3>{item.label}</h3>
        <p>{item.descricao}</p>
      </div>
    </Link>
  );
}
