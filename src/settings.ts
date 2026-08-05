import powerbi from "powerbi-visuals-api";
import DataView = powerbi.DataView;

export interface IGeneralConfig {
    titleText: string;
    useCurrentMonth: boolean;
    defaultMonth: string;
    sortDescending: boolean;
    locale: string;
}

export interface IVisualStyle {
    fontSize: number;
    fontColor: string;
    background: string;
    accentColor: string;
    borderColor: string;
}

export interface IVisualSettings {
    generalConfig: IGeneralConfig;
    visualStyle: IVisualStyle;
}

function getValue<T>(
    objects: powerbi.DataViewObjects | undefined,
    objectName: string,
    propertyName: string,
    defaultValue: T
): T {

    if (!objects) {
        return defaultValue;
    }

    const object = objects[objectName];

    if (!object) {
        return defaultValue;
    }

    const property = (object as Record<string, unknown>)[propertyName];

    if (property === undefined || property === null) {
        return defaultValue;
    }

    if (
        typeof property === "object" &&
        property !== null &&
        "solid" in property
    ) {

        const fill = property as {
            solid?: {
                color?: string;
            };
        };

        if (fill.solid?.color) {
            return fill.solid.color as unknown as T;
        }
    }

    return property as T;
}

export function getDefaultSettings(): IVisualSettings {

    return {

        generalConfig: {
            titleText: "Mês de Consumo",
            useCurrentMonth: true,
            defaultMonth: "",
            sortDescending: true,
            locale: "pt-BR"
        },

        visualStyle: {
            fontSize: 12,
            fontColor: "#252423",
            background: "#FFFFFF",
            accentColor: "#E5F1FB",
            borderColor: "#605E5C"
        }
    };
}

export function parseSettings(dataView: DataView): IVisualSettings {

    const objects =
        dataView?.metadata?.objects;

    const defaults =
        getDefaultSettings();

    return {

        generalConfig: {

            titleText: getValue<string>(
                objects,
                "generalConfig",
                "titleText",
                defaults.generalConfig.titleText
            ),

            useCurrentMonth: getValue<boolean>(
                objects,
                "generalConfig",
                "useCurrentMonth",
                defaults.generalConfig.useCurrentMonth
            ),

            defaultMonth: getValue<string>(
                objects,
                "generalConfig",
                "defaultMonth",
                defaults.generalConfig.defaultMonth
            ),

            sortDescending: getValue<boolean>(
                objects,
                "generalConfig",
                "sortDescending",
                defaults.generalConfig.sortDescending
            ),

            locale: getValue<string>(
                objects,
                "generalConfig",
                "locale",
                defaults.generalConfig.locale
            )
        },

        visualStyle: {

            fontSize: getValue<number>(
                objects,
                "visualStyle",
                "fontSize",
                defaults.visualStyle.fontSize
            ),

            fontColor: getValue<string>(
                objects,
                "visualStyle",
                "fontColor",
                defaults.visualStyle.fontColor
            ),

            background: getValue<string>(
                objects,
                "visualStyle",
                "background",
                defaults.visualStyle.background
            ),

            accentColor: getValue<string>(
                objects,
                "visualStyle",
                "accentColor",
                defaults.visualStyle.accentColor
            ),

            borderColor: getValue<string>(
                objects,
                "visualStyle",
                "borderColor",
                defaults.visualStyle.borderColor
            )
        }
    };
}