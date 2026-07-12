import { useState } from 'react';
import { User, Radio, Shield, ChartPie, Truck, Settings, Copy, Check } from 'lucide-react';

const DEMO_ACCOUNTS = [
  {
    id: 'admin',
    role: 'System Admin',
    email: 'admin@transitops.app',
    password: 'password123',
    icon: Settings,
    color: '#E53935', // Premium red
  },
  {
    id: 'manager',
    role: 'Fleet Manager',
    email: 'manager@transitops.demo',
    password: 'password123',
    icon: User,
    color: '#1E88E5', // Bright blue
  },
  {
    id: 'dispatcher',
    role: 'Dispatcher',
    email: 'dispatcher@transitops.demo',
    password: 'password123',
    icon: Radio,
    color: '#4CAF50', // Bright green
  },
  {
    id: 'driver',
    role: 'Driver',
    email: 'driver@transitops.demo',
    password: 'password123',
    icon: Truck,
    color: '#FFD54F', // Warm Amber
  },
  {
    id: 'safety',
    role: 'Safety Officer',
    email: 'safety@transitops.demo',
    password: 'password123',
    icon: Shield,
    color: '#FF9800', // Bright orange
  },
  {
    id: 'analyst',
    role: 'Financial Analyst',
    email: 'analyst@transitops.demo',
    password: 'password123',
    icon: ChartPie,
    color: '#9C27B0', // Bright purple
  },
];

export default function DemoAccessGrid({ selectedEmail, onSelectAccount }) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = async (e, email, id) => {
    e.stopPropagation(); // Avoid triggering autofill
    try {
      await navigator.clipboard.writeText(email);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div className="demo-access-section">
      <div className="demo-access-header-centered">
        <div className="divider-line" />
        <h3 className="demo-access-title">DEMO ACCESS</h3>
        <div className="divider-line" />
      </div>
      <p className="demo-access-subtitle-centered">
        Explore TransitOps with preconfigured role-based accounts.
      </p>

      <div className="demo-grid" role="group" aria-label="Demo accounts selection">
        {DEMO_ACCOUNTS.map((account) => {
          const Icon = account.icon;
          const isSelected = selectedEmail === account.email;
          const isCopied = copiedId === account.id;

          return (
            <div
              key={account.id}
              className={`demo-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectAccount(account.email, account.password)}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectAccount(account.email, account.password);
                }
              }}
            >
              {/* Copy Button (absolute top-right) */}
              <button
                className={`copy-button-subtle ${isCopied ? 'copied' : ''}`}
                onClick={(e) => handleCopy(e, account.email, account.id)}
                title="Copy email address"
                aria-label={`Copy email for ${account.role}`}
              >
                {isCopied ? <Check size={12} /> : <Copy size={12} />}
              </button>

              {/* Card Left: Outline Icon */}
              <div className="demo-card-icon-container">
                <Icon size={18} strokeWidth={1.5} style={{ color: account.color }} />
              </div>

              {/* Card Center: Details */}
              <div className="demo-card-details">
                <span className="demo-card-role">{account.role}</span>
                <span className="demo-card-email">{account.email}</span>
                <span className="use-account-badge">USE ACCOUNT</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
