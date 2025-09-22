import { useState, useEffect } from 'react';

export interface EntryPointConfig {
  version: '0.6' | '0.7';
  address: string;
  name: string;
  description: string;
  supportedBundlers: string[];
}

interface EntryPointSelectorProps {
  onEntryPointChange: (entryPoint: EntryPointConfig) => void;
  selectedEntryPoint?: EntryPointConfig;
  bundlerType: 'rundler' | 'alchemy';
  disabled?: boolean;
}

const ENTRY_POINT_OPTIONS: EntryPointConfig[] = [
  {
    version: '0.6',
    address: '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    name: 'EntryPoint v0.6',
    description: 'ERC-4337 原始版本，广泛支持',
    supportedBundlers: ['rundler', 'alchemy']
  },
  {
    version: '0.7',
    address: '0x0000000071727De22E5E9d8BAf0edAc6f37da032',
    name: 'EntryPoint v0.7',
    description: '优化版本，提升 gas 效率',
    supportedBundlers: ['alchemy']
  }
];

export default function EntryPointSelector({
  onEntryPointChange,
  selectedEntryPoint,
  bundlerType,
  disabled = false
}: EntryPointSelectorProps) {
  const [selected, setSelected] = useState<EntryPointConfig>(
    selectedEntryPoint || ENTRY_POINT_OPTIONS[0]
  );

  // 过滤支持当前 bundler 类型的 EntryPoint
  const availableOptions = ENTRY_POINT_OPTIONS.filter(ep =>
    ep.supportedBundlers.includes(bundlerType)
  );

  useEffect(() => {
    if (selectedEntryPoint) {
      setSelected(selectedEntryPoint);
    } else {
      // 如果当前选择的 EntryPoint 不支持新的 bundler，自动切换到第一个可用的
      if (!selected.supportedBundlers.includes(bundlerType)) {
        const firstAvailable = availableOptions[0];
        if (firstAvailable) {
          setSelected(firstAvailable);
          onEntryPointChange(firstAvailable);
        }
      }
    }
  }, [selectedEntryPoint, bundlerType, selected, availableOptions, onEntryPointChange]);

  const handleEntryPointChange = (version: '0.6' | '0.7') => {
    const entryPoint = ENTRY_POINT_OPTIONS.find(ep => ep.version === version);
    if (entryPoint && entryPoint.supportedBundlers.includes(bundlerType)) {
      setSelected(entryPoint);
      onEntryPointChange(entryPoint);
    }
  };

  return (
    <div className={`entrypoint-selector ${disabled ? 'disabled' : ''}`}>
      <h4>🔗 EntryPoint 版本</h4>
      <div className="entrypoint-options">
        {availableOptions.map((entryPoint) => (
          <div
            key={entryPoint.version}
            className={`entrypoint-option ${selected.version === entryPoint.version ? 'selected' : ''}`}
            onClick={() => !disabled && handleEntryPointChange(entryPoint.version)}
          >
            <div className="entrypoint-header">
              <span className="entrypoint-name">{entryPoint.name}</span>
              <span className="version-badge">v{entryPoint.version}</span>
            </div>
            <div className="entrypoint-description">{entryPoint.description}</div>
            <div className="entrypoint-address">
              <small>{entryPoint.address}</small>
            </div>
          </div>
        ))}
      </div>

      {bundlerType === 'rundler' && (
        <div className="bundler-note">
          <span className="note-icon">ℹ️</span>
          <span>Rundler 目前仅支持 EntryPoint v0.6</span>
        </div>
      )}

      {bundlerType === 'alchemy' && (
        <div className="bundler-note">
          <span className="note-icon">✨</span>
          <span>Alchemy 支持 EntryPoint v0.6 和 v0.7</span>
        </div>
      )}

      <style jsx>{`
        .entrypoint-selector {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 16px;
          margin: 12px 0;
          border: 1px solid #e9ecef;
        }

        .entrypoint-selector.disabled {
          opacity: 0.6;
          pointer-events: none;
        }

        .entrypoint-selector h4 {
          margin: 0 0 12px 0;
          color: #495057;
          font-size: 1rem;
          font-weight: 600;
        }

        .entrypoint-options {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .entrypoint-option {
          border: 1px solid #dee2e6;
          border-radius: 6px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          background: white;
        }

        .entrypoint-option:hover {
          border-color: #007bff;
          box-shadow: 0 1px 4px rgba(0, 123, 255, 0.1);
        }

        .entrypoint-option.selected {
          border-color: #007bff;
          background: #e3f2fd;
          box-shadow: 0 2px 6px rgba(0, 123, 255, 0.15);
        }

        .entrypoint-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }

        .entrypoint-name {
          font-weight: 600;
          color: #1a1a1a;
          font-size: 0.9rem;
        }

        .version-badge {
          background: #17a2b8;
          color: white;
          padding: 3px 6px;
          border-radius: 3px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .entrypoint-description {
          color: #6c757d;
          font-size: 0.8rem;
          margin-bottom: 6px;
          line-height: 1.3;
        }

        .entrypoint-address {
          padding-top: 6px;
          border-top: 1px solid #f1f3f4;
        }

        .entrypoint-address small {
          color: #6c757d;
          font-family: monospace;
          font-size: 0.7rem;
          word-break: break-all;
        }

        .bundler-note {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
          padding: 8px 12px;
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 4px;
          font-size: 0.8rem;
          color: #856404;
        }

        .note-icon {
          font-size: 1rem;
        }

        @media (max-width: 768px) {
          .entrypoint-selector {
            padding: 12px;
          }

          .entrypoint-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
}