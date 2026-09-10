export { allCoverage, destinationCoverage, globallyCoveredInterests } from "./coverage";
export type { DestinationCoverage, InterestCoverage } from "./coverage";
export { matchDestinations, scoreDestination, MATCH_WEIGHTS, SATURATION } from "./match";
export type { DestinationMatch, MatchComponent } from "./match";
export { THEMES, themesFor } from "./themes";
export type { Theme, ThemeEvidence, ThemePresence } from "./themes";
export { connectionsFrom, destinationsWithTheme, themeIndex } from "./connections";
export type { ConnectionKind, DestinationConnection } from "./connections";
