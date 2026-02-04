
import React from 'react';

interface Props {
  judgment: 'PASS' | 'WARNING' | 'FAIL';
}

export const JudgmentBadge: React.FC<Props> = ({ judgment }) => {
  switch (judgment) {
    case 'PASS':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <i className="fas fa-check-circle mr-1"></i> 合格
        </span>
      );
    case 'WARNING':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <i className="fas fa-exclamation-triangle mr-1"></i> 注意
        </span>
      );
    case 'FAIL':
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <i className="fas fa-times-circle mr-1"></i> 修正要
        </span>
      );
    default:
      return null;
  }
};
