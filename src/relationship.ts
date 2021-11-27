import { Barrel, Test, Component, Style, Translation } from "./templates";
import type { FileBase } from "./templates";

interface Node {
	instance: FileBase | null;
	template: typeof FileBase;
	name: string;
	children: string[];
	open?: boolean;
}

export interface Relationships {
	entrypoints: string[];
	nodes: Record<string, Node>;
}

export const relationships: Relationships = {
	entrypoints: ["barrel", "test"],
	nodes: {
		barrel: {
			instance: null,
			template: Barrel,
			name: "barrel",
			children: ["component"],
		},
		test: {
			instance: null,
			template: Test,
			name: "test",
			children: ["component"],
		},
		component: {
			instance: null,
			template: Component,
			name: "component",
			children: ["style", "translation"],
			open: true,
		},
		style: {
			instance: null,
			template: Style,
			name: "style",
			children: [],
		},
		translation: {
			instance: null,
			template: Translation,
			name: "translation",
			children: [],
		},
	},
};
