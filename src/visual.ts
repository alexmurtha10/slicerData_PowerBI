"use strict";

import powerbi from "powerbi-visuals-api";
import * as models from "powerbi-models";

import FilterAction = powerbi.FilterAction;
import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import DataView = powerbi.DataView;
import DataViewCategorical = powerbi.DataViewCategorical;

import { parseSettings, getDefaultSettings, IVisualSettings } from "./settings";

interface IMonthOption {
    key: string;
    rawValue: string;
    year: number;
    month: number;
    label: string;
}

const MONTH_ALIASES: Record<string, number> = {
    jan: 0,
    janeiro: 0,

    fev: 1,
    fevereiro: 1,

    mar: 2,
    marco: 2,
    março: 2,

    abr: 3,
    abril: 3,

    mai: 4,
    maio: 4,

    jun: 5,
    junho: 5,

    jul: 6,
    julho: 6,

    ago: 7,
    agosto: 7,

    set: 8,
    setembro: 8,

    out: 9,
    outubro: 9,

    nov: 10,
    novembro: 10,

    dez: 11,
    dezembro: 11
};

export class Visual implements IVisual {
    private host: IVisualHost;
    private target: HTMLElement;

    private root: HTMLDivElement;
    private titleRow: HTMLDivElement;
    private selectedDateRow: HTMLDivElement;
    private buttonsRow: HTMLDivElement;

    private settings: IVisualSettings = getDefaultSettings();

    private options: IMonthOption[] = [];
    private selectedKey: string | null = null;
    private columnTarget: models.IFilterColumnTarget | null = null;

    private lastAppliedKey: string | null = null;
    private hasInitialized: boolean = false;

    public constructor(options: VisualConstructorOptions) {
        this.host = options.host;
        this.target = options.element;

        this.injectBaseStyles();

        this.root = document.createElement("div");
        this.root.className = "date-filter-root";

        this.titleRow = document.createElement("div");
        this.titleRow.className = "date-filter-title-row";

        this.selectedDateRow = document.createElement("div");
        this.selectedDateRow.className = "date-filter-selected-row";

        this.buttonsRow = document.createElement("div");
        this.buttonsRow.className = "date-filter-buttons-row";

        this.root.appendChild(this.titleRow);
        this.root.appendChild(this.selectedDateRow);
        this.root.appendChild(this.buttonsRow);

        this.target.appendChild(this.root);
    }

    public destroy(): void {
        this.target.innerHTML = "";
    }

    public update(options: VisualUpdateOptions): void {
        const dataView: DataView | undefined =
            options.dataViews && options.dataViews[0];

        const categorical: DataViewCategorical | undefined =
            dataView && dataView.categorical;

        const categories = categorical && categorical.categories;

        if (!dataView || !categorical || !categories || categories.length === 0) {
            this.renderEmpty();
            return;
        }

        this.settings = parseSettings(dataView);
        this.applyStyles();

        const categoryColumn = categories[0];

        this.titleRow.textContent =
            this.settings.generalConfig.titleText || "Filtro de Data";

        const queryName = categoryColumn.source.queryName || "";
        const dotIndex = queryName.indexOf(".");

        const tableName =
            dotIndex >= 0
                ? queryName.substring(0, dotIndex)
                : queryName;

        const columnName =
            dotIndex >= 0
                ? queryName.substring(dotIndex + 1)
                : categoryColumn.source.displayName;

        this.columnTarget = {
            table: tableName,
            column: columnName
        };

        this.options = this.buildTextMonthOptions(
            (categoryColumn.values || []) as powerbi.PrimitiveValue[]
        );

        this.sortOptions();

        if (!this.hasInitialized) {
            this.selectedKey = this.getInitialKey();
            this.applyFilterForKey(this.selectedKey, true);
        } else {
            const existingKey = this.getSelectedKeyFromExistingFilter(
                options.jsonFilters,
                this.columnTarget
            );

            if (
                existingKey &&
                this.options.some((option: IMonthOption) => option.key === existingKey)
            ) {
                this.selectedKey = existingKey;
                this.lastAppliedKey = existingKey;
            }
        }

        this.hasInitialized = true;

        this.renderSelectedDate();
        this.renderButtons();
    }

    private buildTextMonthOptions(values: powerbi.PrimitiveValue[]): IMonthOption[] {
        const map = new Map<string, IMonthOption>();

        for (const raw of values) {
            if (raw === null || raw === undefined) {
                continue;
            }

            const rawValue = String(raw).trim();

            if (!rawValue) {
                continue;
            }

            const parsed = this.parseMonthYearText(rawValue);

            if (!parsed) {
                continue;
            }

            const key =
                `${parsed.year}-${String(parsed.month + 1).padStart(2, "0")}`;

            if (!map.has(key)) {
                map.set(key, {
                    key: key,
                    rawValue: rawValue,
                    year: parsed.year,
                    month: parsed.month,
                    label: rawValue
                });
            }
        }

        return Array.from(map.values());
    }

    private parseMonthYearText(value: string): { month: number; year: number } | null {
        const normalized = value
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        const parts = normalized.split("/");

        if (parts.length !== 2) {
            return null;
        }

        const monthText = parts[0].trim();
        const yearText = parts[1].trim();

        const month = MONTH_ALIASES[monthText];
        const year = Number(yearText);

        if (month === undefined || Number.isNaN(year)) {
            return null;
        }

        return {
            month: month,
            year: year
        };
    }

    private sortOptions(): void {
        if (this.settings.generalConfig.sortDescending) {
            this.options.sort((a: IMonthOption, b: IMonthOption) => {
                return b.key.localeCompare(a.key);
            });

            return;
        }

        this.options.sort((a: IMonthOption, b: IMonthOption) => {
            return a.key.localeCompare(b.key);
        });
    }

    private getCurrentMonthKey(): string {
        const now = new Date();

        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    }

    private getInitialKey(): string | null {
        const cfg = this.settings.generalConfig;

        if (cfg.useCurrentMonth) {
            const currentKey = this.getCurrentMonthKey();

            if (this.options.some((option: IMonthOption) => option.key === currentKey)) {
                return currentKey;
            }

            return this.options.length > 0 ? this.options[0].key : null;
        }

        if (cfg.defaultMonth) {
            const parsedDefault = this.parseMonthYearText(cfg.defaultMonth);

            if (parsedDefault) {
                const defaultKey =
                    `${parsedDefault.year}-${String(parsedDefault.month + 1).padStart(2, "0")}`;

                if (this.options.some((option: IMonthOption) => option.key === defaultKey)) {
                    return defaultKey;
                }
            }
        }

        return this.options.length > 0 ? this.options[0].key : null;
    }

    private getSelectedKeyFromExistingFilter(
        jsonFilters: powerbi.IFilter[] | undefined,
        target: models.IFilterColumnTarget | null
    ): string | null {
        if (!jsonFilters || jsonFilters.length === 0 || !target) {
            return null;
        }

        for (const item of jsonFilters) {
            const filter = item as models.IBasicFilter;
            const filterTarget = filter.target as models.IFilterColumnTarget | undefined;

            if (
                filterTarget &&
                filterTarget.table === target.table &&
                filterTarget.column === target.column &&
                filter.values &&
                filter.values.length > 0
            ) {
                const selectedRawValue = String(filter.values[0]);

                const option = this.options.find((monthOption: IMonthOption) => {
                    return monthOption.rawValue === selectedRawValue;
                });

                if (option) {
                    return option.key;
                }
            }
        }

        return null;
    }

    private applyFilterForKey(key: string | null, isInitial: boolean = false): void {
        if (!this.columnTarget) {
            return;
        }

        if (!key) {
            this.host.applyJsonFilter(
                [] as powerbi.IFilter[],
                "general",
                "filter",
                FilterAction.remove
            );

            this.lastAppliedKey = null;
            return;
        }

        if (key === this.lastAppliedKey && !isInitial) {
            return;
        }

        const selectedOption = this.options.find((option: IMonthOption) => {
            return option.key === key;
        });

        if (!selectedOption) {
            return;
        }

        const filter: models.IBasicFilter = {
            $schema: "http://powerbi.com/product/schema#basic",
            target: this.columnTarget,
            filterType: models.FilterType.Basic,
            operator: "In",
            values: [selectedOption.rawValue]
        };

        this.host.applyJsonFilter(
            filter,
            "general",
            "filter",
            FilterAction.merge
        );

        this.lastAppliedKey = key;
    }

    private renderSelectedDate(): void {
        const selectedOption = this.getSelectedOption();

        if (!selectedOption) {
            this.selectedDateRow.textContent = "Data selecionada: -";
            return;
        }

        this.selectedDateRow.textContent =
            `Data selecionada: ${selectedOption.label}`;
    }

    private renderButtons(): void {
        this.buttonsRow.innerHTML = "";

        for (const option of this.options) {
            const button = document.createElement("button");
            button.className = this.getMonthButtonClass(option);
            button.textContent = option.label;

            button.addEventListener("click", () => {
                this.selectOption(option);
            });

            this.buttonsRow.appendChild(button);
        }

        this.scrollSelectedButtonIntoView();
    }

    private getMonthButtonClass(option: IMonthOption): string {
        return "date-filter-button" +
            (option.key === this.selectedKey ? " selected" : "");
    }

    private selectOption(option: IMonthOption): void {
        this.selectedKey = option.key;

        this.applyFilterForKey(option.key);
        this.renderSelectedDate();
        this.renderButtons();
    }

    private getSelectedOption(): IMonthOption | null {
        const selectedOption = this.options.find((option: IMonthOption) => {
            return option.key === this.selectedKey;
        });

        if (selectedOption) {
            return selectedOption;
        }

        const currentKey = this.getCurrentMonthKey();

        const currentOption = this.options.find((option: IMonthOption) => {
            return option.key === currentKey;
        });

        return currentOption || null;
    }

    private scrollSelectedButtonIntoView(): void {
        window.setTimeout(() => {
            const selectedButton =
                this.buttonsRow.querySelector(".date-filter-button.selected") as HTMLElement | null;

            if (selectedButton) {
                selectedButton.scrollIntoView({
                    block: "nearest",
                    inline: "center",
                    behavior: "auto"
                });
            }
        }, 0);
    }

    private applyStyles(): void {
        const style = this.settings.visualStyle;

        this.root.style.setProperty("--date-filter-font-size", `${style.fontSize}px`);
        this.root.style.setProperty("--date-filter-font-color", style.fontColor);
        this.root.style.setProperty("--date-filter-bg", style.background);
        this.root.style.setProperty("--date-filter-accent", style.accentColor);
        this.root.style.setProperty("--date-filter-border", style.borderColor);
    }

    private renderEmpty(): void {
        this.titleRow.textContent =
            this.settings.generalConfig.titleText || "Filtro de Data";

        this.selectedDateRow.textContent = "Data selecionada: -";
        this.buttonsRow.innerHTML = "";

        this.options = [];
        this.selectedKey = null;
        this.lastAppliedKey = null;
    }

    private injectBaseStyles(): void {
        const styleId = "date-filter-base-styles";

        if (document.getElementById(styleId)) {
            return;
        }

        const style = document.createElement("style");
        style.id = styleId;

        style.textContent = `
            .date-filter-root {
                width: 100%;
                height: 100%;
                max-height: 132px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                overflow: hidden;
                background: var(--date-filter-bg, #ffffff);
                color: var(--date-filter-font-color, #252423);
                font-family: "Segoe UI", Arial, sans-serif;
                font-size: var(--date-filter-font-size, 12px);
                border: 1px solid var(--date-filter-border, #d2d0ce);
                border-radius: 6px;
            }

            .date-filter-title-row {
                flex: 0 0 32px;
                height: 32px;
                display: flex;
                align-items: center;
                padding: 0 12px;
                box-sizing: border-box;
                border-bottom: 1px solid #edebe9;
                font-weight: 600;
                font-size: 12px;
                color: var(--date-filter-font-color, #252423);
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .date-filter-selected-row {
                flex: 0 0 30px;
                height: 30px;
                display: flex;
                align-items: center;
                padding: 0 12px;
                box-sizing: border-box;
                border-bottom: 1px solid #edebe9;
                font-weight: 500;
                font-size: 12px;
                color: #605e5c;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                background: #faf9f8;
            }

            .date-filter-buttons-row {
                flex: 1 1 auto;
                min-height: 0;
                height: 70px;
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 10px;
                box-sizing: border-box;
                overflow-x: auto;
                overflow-y: hidden;
                white-space: nowrap;
                background: var(--date-filter-bg, #ffffff);
                scrollbar-width: thin;
            }

            .date-filter-buttons-row::-webkit-scrollbar {
                height: 6px;
            }

            .date-filter-buttons-row::-webkit-scrollbar-thumb {
                background: #c8c6c4;
                border-radius: 10px;
            }

            .date-filter-buttons-row::-webkit-scrollbar-track {
                background: transparent;
            }

            .date-filter-button {
                flex: 0 0 auto;
                height: 36px;
                min-width: 92px;
                padding: 0 14px;
                box-sizing: border-box;
                border: 1px solid var(--date-filter-border, #d2d0ce);
                border-radius: 4px;
                background: #ffffff;
                color: var(--date-filter-font-color, #252423);
                font-family: "Segoe UI", Arial, sans-serif;
                font-size: 12px;
                font-weight: 500;
                cursor: pointer;
                outline: none;
                box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
            }

            .date-filter-button:hover {
                background: #f3f2f1;
                border-color: #a19f9d;
            }

            .date-filter-button.selected {
                background: var(--date-filter-accent, #e5f1fb);
                border-color: #0078d4;
                color: #005a9e;
                font-weight: 600;
                box-shadow: inset 0 0 0 1px #0078d4;
            }
        `;

        document.head.appendChild(style);
    }

    public enumerateObjectInstances(
        options: powerbi.EnumerateVisualObjectInstancesOptions
    ): powerbi.VisualObjectInstanceEnumeration {
        const instances: powerbi.VisualObjectInstance[] = [];
        const objectName = options.objectName;

        if (objectName === "generalConfig") {
            instances.push({
                objectName: objectName,
                selector: {} as powerbi.data.Selector,
                properties: {
                    titleText: this.settings.generalConfig.titleText,
                    useCurrentMonth: this.settings.generalConfig.useCurrentMonth,
                    defaultMonth: this.settings.generalConfig.defaultMonth,
                    sortDescending: this.settings.generalConfig.sortDescending,
                    locale: this.settings.generalConfig.locale
                }
            });
        }

        if (objectName === "visualStyle") {
            instances.push({
                objectName: objectName,
                selector: {} as powerbi.data.Selector,
                properties: {
                    fontSize: this.settings.visualStyle.fontSize,
                    fontColor: this.settings.visualStyle.fontColor,
                    background: this.settings.visualStyle.background,
                    accentColor: this.settings.visualStyle.accentColor,
                    borderColor: this.settings.visualStyle.borderColor
                }
            });
        }

        return instances;
    }
}