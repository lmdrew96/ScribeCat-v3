/**
 * Shared wrapper for study tools — handles the generate/loading/error gate
 * and provides a consistent header with an optional count label.
 */

import type { ReactNode } from 'react';
import { GenerateButton } from './generate-button';

interface ToolWrapperProps {
  data: unknown;
  isGenerating: boolean;
  error: string | null;
  generate: () => Promise<void>;
  hasData: boolean;
  label: string;
  description: string;
  headerLeft?: ReactNode;
  children: ReactNode;
}

export function ToolWrapper({
  data,
  isGenerating,
  error,
  generate,
  hasData,
  label,
  description,
  headerLeft,
  children,
}: ToolWrapperProps) {
  if (!data || isGenerating || error) {
    return (
      <GenerateButton
        onGenerate={generate}
        isGenerating={isGenerating}
        hasData={hasData}
        error={error}
        label={label}
        description={description}
      />
    );
  }

  return (
    <div className="space-y-2">
      <div className={`flex items-center ${headerLeft ? 'justify-between' : 'justify-end'}`}>
        {headerLeft}
        <GenerateButton
          onGenerate={generate}
          isGenerating={isGenerating}
          hasData={hasData}
          error={error}
        />
      </div>
      {children}
    </div>
  );
}
