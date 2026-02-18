import type { GrammarDefinition } from "@paimaexample/concise";
import { builtinGrammars } from "@paimaexample/sm/grammar";
import { Type } from "@sinclair/typebox";

export const effectstreamL2Grammar = {
  setName: [["name", Type.String()]],
  submitScore: [
    ["accountId", Type.Integer()],
  ],
  delegate: [
    ["delegateToAddress", Type.String()],
  ],
  play: [
    ["stat1", Type.Integer()],
    ["stat2", Type.Integer()],
    ["stat3", Type.Integer()],
    ["stat4", Type.Integer()],
    ["stat5", Type.Integer()],
    ["item1", Type.Union([Type.String(), Type.Null()])],
    ["item2", Type.Union([Type.String(), Type.Null()])],
    ["item3", Type.Union([Type.String(), Type.Null()])],
    ["item4", Type.Union([Type.String(), Type.Null()])],
    ["item5", Type.Union([Type.String(), Type.Null()])],
    ["item6", Type.Union([Type.String(), Type.Null()])],
    ["item7", Type.Union([Type.String(), Type.Null()])],
    ["item8", Type.Union([Type.String(), Type.Null()])],
    ["item9", Type.Union([Type.String(), Type.Null()])],
    ["item10", Type.Union([Type.String(), Type.Null()])],
  ],
  executeRace: [
    ["accountId", Type.Integer()],
    ["raceHash", Type.String()],
  ] as const,


} as const satisfies GrammarDefinition;

export const grammar = {
  ...effectstreamL2Grammar,

  "event_midnight": builtinGrammars.midnightGeneric,
} as const satisfies GrammarDefinition;
