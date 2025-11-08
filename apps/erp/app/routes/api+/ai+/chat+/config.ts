import type { ToolConfig } from "./agents/shared/tools";

// Dynamically import all tool configs
const toolModules = import.meta.glob("./tools/*/index.ts", {
  eager: true,
}) as Record<string, { config: ToolConfig }>;

// Alternative pattern for direct tool files
const directToolModules = import.meta.glob("./tools/*.ts", {
  eager: true,
}) as Record<string, { config: ToolConfig }>;

// Combine both patterns and create the config object
export const toolConfigs: Record<
  string,
  Pick<ToolConfig, "icon" | "displayText">
> = {
  ...Object.values(toolModules).reduce((acc, module) => {
    if (module.config) {
      acc[module.config.name] = {
        icon: module.config.icon,
        displayText: module.config.displayText,
      };
    }
    return acc;
  }, {} as Record<string, Pick<ToolConfig, "icon" | "displayText">>),

  ...Object.values(directToolModules).reduce((acc, module) => {
    if (module.config) {
      acc[module.config.name] = {
        icon: module.config.icon,
        displayText: module.config.displayText,
      };
    }
    return acc;
  }, {} as Record<string, Pick<ToolConfig, "icon" | "displayText">>),
};

console.log(toolConfigs);
