import { Pencil, Printer, Trash2 } from 'lucide-react';

function ActionIconButton({
  title,
  ariaLabel,
  onClick,
  icon: Icon,
  tone = 'default',
  disabled = false,
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={ariaLabel || title}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={`standard-action-button${tone === 'danger' ? ' is-danger' : ''}`}
    >
      <Icon size={13} strokeWidth={1.8} />
    </button>
  );
}

export default function StandardActionButtons({
  actions,
  onEdit,
  onPrint,
  onDelete,
  canEdit = true,
  canPrint = true,
  canDelete = true,
  editTitle = 'Editar',
  printTitle = 'Imprimir',
  deleteTitle = 'Excluir',
  className = '',
}) {
  const customActions = Array.isArray(actions)
    ? actions.filter((action) => action && action.icon && action.onClick)
    : null;

  const defaultActions = [
    onEdit
      ? {
          key: 'edit',
          title: editTitle,
          onClick: onEdit,
          icon: Pencil,
          disabled: !canEdit,
        }
      : null,
    onPrint
      ? {
          key: 'print',
          title: printTitle,
          onClick: onPrint,
          icon: Printer,
          disabled: !canPrint,
        }
      : null,
    onDelete
      ? {
          key: 'delete',
          title: deleteTitle,
          onClick: onDelete,
          icon: Trash2,
          tone: 'danger',
          disabled: !canDelete,
        }
      : null,
  ].filter(Boolean);

  const resolvedActions = customActions ?? defaultActions;

  if (resolvedActions.length === 0) return null;

  return (
    <div className={`standard-action-buttons ${className}`.trim()}>
      {resolvedActions.map((action, index) => (
        <ActionIconButton
          key={action.key || `${action.title || 'acao'}-${index}`}
          title={action.title || 'Ação'}
          ariaLabel={action.ariaLabel}
          onClick={action.onClick}
          icon={action.icon}
          tone={action.tone}
          disabled={Boolean(action.disabled)}
        />
      ))}
    </div>
  );
}
