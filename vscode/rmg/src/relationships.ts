import { Barrel, Test, Component, Style, Translation } from "./templates";
import type { Relationships } from "@file-generator/core";

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
