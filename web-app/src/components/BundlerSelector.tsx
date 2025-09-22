import { useState, useEffect } from 'react';

export interface BundlerConfig {
  name: string;
  type: 'rundler' | 'alchemy';
  url: string;
  supportedEntryPoints: string[];
  description: string;
}

interface BundlerSelectorProps {
  onBundlerChange: (bundler: BundlerConfig) => void;
  selectedBundler?: BundlerConfig;
}

const BUNDLER_OPTIONS: BundlerConfig[] = [
  {
    name: 'SuperRelay Rundler',
    type: 'rundler',
    url: 'https://rundler-superrelay.fly.dev',
    supportedEntryPoints: ['0.6'],
    description: '自部署的 Rundler 服务，支持 EntryPoint v0.6'
  },
  {
    name: 'Alchemy Bundler',
    type: 'alchemy',
    url: '', // Will be set dynamically based on network
    supportedEntryPoints: ['0.6', '0.7'],
    description: 'Alchemy 官方 Bundler 服务，支持 EntryPoint v0.6 和 v0.7'
  }
];

export default function BundlerSelector({ onBundlerChange, selectedBundler }: BundlerSelectorProps) {
  const [selected, setSelected] = useState<BundlerConfig>(selectedBundler || BUNDLER_OPTIONS[0]);

  useEffect(() => {
    if (selectedBundler) {
      setSelected(selectedBundler);
    }
  }, [selectedBundler]);

  const handleBundlerChange = (bundlerName: string) => {
    const bundler = BUNDLER_OPTIONS.find(b => b.name === bundlerName);
    if (bundler) {
      setSelected(bundler);
      onBundlerChange(bundler);
    }
  };

  return (
    <div className="bundler-selector">
      <h3>🌐 Bundler 选择</h3>
      <div className="bundler-options">
        {BUNDLER_OPTIONS.map((bundler) => (
          <div
            key={bundler.name}
            className={`bundler-option ${selected.name === bundler.name ? 'selected' : ''}`}
            onClick={() => handleBundlerChange(bundler.name)}
          >
            <div className="bundler-header">
              <span className="bundler-name">{bundler.name}</span>
              <span className="bundler-type">{bundler.type.toUpperCase()}</span>
            </div>
            <div className="bundler-description">{bundler.description}</div>
            <div className="bundler-support">
              <span>支持 EntryPoint: </span>
              {bundler.supportedEntryPoints.map(version => (
                <span key={version} className="version-tag">v{version}</span>
              ))}
            </div>
            {bundler.url && (
              <div className="bundler-url">
                <small>{bundler.url}</small>
              </div>
            )}
          </div>
        ))}
      </div>

      <style jsx>{`
        .bundler-selector {
          background: white;
          border-radius: 12px;
          padding: 24px;
          margin: 16px 0;
          border: 1px solid #e9ecef;
        }

        .bundler-selector h3 {
          margin: 0 0 16px 0;
          color: #1a1a1a;
          font-size: 1.2rem;
        }

        .bundler-options {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .bundler-option {
          border: 2px solid #e9ecef;
          border-radius: 8px;
          padding: 16px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: #f8f9fa;
        }

        .bundler-option:hover {
          border-color: #007bff;
          background: #f0f8ff;
        }

        .bundler-option.selected {
          border-color: #007bff;
          background: #e3f2fd;
          box-shadow: 0 2px 8px rgba(0, 123, 255, 0.1);
        }

        .bundler-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .bundler-name {
          font-weight: 600;
          color: #1a1a1a;
          font-size: 1rem;
        }

        .bundler-type {
          background: #007bff;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .bundler-description {
          color: #6c757d;
          font-size: 0.875rem;
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .bundler-support {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 0.875rem;
          color: #495057;
        }

        .version-tag {
          background: #28a745;
          color: white;
          padding: 2px 6px;
          border-radius: 3px;
          font-size: 0.75rem;
          font-weight: 500;
        }

        .bundler-url {
          margin-top: 8px;
          padding-top: 8px;
          border-top: 1px solid #dee2e6;
        }

        .bundler-url small {
          color: #6c757d;
          font-family: monospace;
          font-size: 0.75rem;
          word-break: break-all;
        }

        @media (max-width: 768px) {
          .bundler-selector {
            margin: 12px 0;
            padding: 16px;
          }

          .bundler-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}