import { PluginSettingOption } from "./types";

export interface PluginSettingsStore<T extends Record<string, PluginSettingOption>> {
    store: {
        [K in keyof T]: T[K]["default"];
    };
    use(): {
        [K in keyof T]: T[K]["default"];
    };
    options: T;
}

export function definePluginSettings<T extends Record<string, PluginSettingOption>>(options: T): PluginSettingsStore<T> {
    const store = {} as any;
    for (const key of Object.keys(options)) {
        store[key] = options[key].default;
    }
    return {
        store,
        use: () => store,
        options
    };
}
