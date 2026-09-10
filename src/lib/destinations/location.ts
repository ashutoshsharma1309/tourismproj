/**
 * The one-line "where is this" that sits under a destination's name.
 *
 * A card reads "city, state" — but several destinations in the registry ARE
 * their own region (Sikkim is a state; Delhi is a territory), and repeating
 * the name back at the reader ("Sikkim, Sikkim") makes the line look broken.
 * So the region is dropped when it only restates the name, and the country
 * takes its place. That keeps every card to exactly two lines of identity
 * without a per-destination exception list.
 */
export function destinationLocationLine(
  name: string,
  region: string | null | undefined,
  country: string,
): string {
  const trimmed = region?.trim();
  if (!trimmed || trimmed.toLowerCase() === name.trim().toLowerCase()) {
    return country;
  }
  return `${trimmed}, ${country}`;
}
