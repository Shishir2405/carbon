import { cn, TextShimmer } from "@carbon/react";
import type { IconType } from "react-icons";

import { toolConfigs as toolDisplayConfig } from "~/routes/api+/ai+/chat+/config";

export interface ToolConfig {
  name: string;
  icon: IconType;
  description?: string;
}
export type SupportedToolName = keyof typeof toolDisplayConfig;

export interface ToolCallIndicatorProps {
  toolName: SupportedToolName;
  className?: string;
}

export function getToolIcon(toolName: SupportedToolName): IconType | null {
  return toolDisplayConfig[toolName]?.icon ?? null;
}

export function ToolCallIndicator({
  toolName,
  className,
}: ToolCallIndicatorProps) {
  const config = toolDisplayConfig[toolName];

  if (!config) {
    return null;
  }

  return (
    <div className={cn("flex justify-start mt-3 animate-fade-in", className)}>
      <div className="border px-3 py-1 flex items-center gap-2 w-fit">
        <div className="flex items-center justify-center size-3.5">
          <config.icon size={14} />
        </div>
        <TextShimmer className="text-xs text-muted-foreground" duration={1}>
          {config.displayText ?? ""}
        </TextShimmer>
      </div>
    </div>
  );
}
