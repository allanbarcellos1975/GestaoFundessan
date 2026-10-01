import { Banknote, BriefcaseBusiness, CalendarClock, CircleAlert } from 'lucide-react';

const cards = [
  { title: 'Propostas', value: '0', icon: BriefcaseBusiness },
  { title: 'Empréstimos Ativos', value: '0', icon: Banknote },
  { title: 'Próximos Vencimentos', value: '0', icon: CalendarClock },
  { title: 'Em Atraso', value: '0', icon: CircleAlert },
];

export default function DashboardPage() {
  return (
    <div className="page-content">
      <div className="page-header-row">
        <h1>Dashboard</h1>
      </div>

      <div className="dashboard-grid">
        {cards.map(({ title, value, icon: Icon }) => (
          <section className="dashboard-card" key={title}>
            <div className="dashboard-card-header">
              <h2 className="dashboard-card-title">{title}</h2>
            </div>
            <div className="dashboard-card-content">
              <strong>{value}</strong>
              <div className="dashboard-card-icon">
                <Icon size={20} />
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="content-card dashboard-note">
        <h2>Estrutura inicial pronta</h2>
      </section>
    </div>
  );
}
