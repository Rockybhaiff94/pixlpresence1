export enum OptionType {
    BOOLEAN = 0,
    STRING = 1,
    NUMBER = 2,
    BIGINT = 3,
    SELECT = 4,
    COLOR = 5,
    COMPONENT = 6,
    CUSTOM = 7
}

export interface Author {
    name: string;
    id: bigint;
}

export interface PluginSettingOption {
    type: OptionType;
    description: string;
    default?: any;
    restartNeeded?: boolean;
    onChange?: (value: any) => void;
    placeholder?: string;
    options?: { label: string; value: any }[];
    component?: (props: any) => any;
}

export interface PluginDefinition {
    name: string;
    description: string;
    authors: Author[];
    settings?: any;
    options?: Record<string, PluginSettingOption>;
    settingsAboutComponent?: () => any;
    start?: () => void | Promise<void>;
    stop?: () => void | Promise<void>;
    patches?: any[];
    tags?: string[];
    dependencies?: string[];
    optionalDependencies?: string[];
    required?: boolean;
    enabledByDefault?: boolean;
    [key: string]: any;
}

export default function definePlugin<T extends PluginDefinition>(def: T): T {
    return def;
}
