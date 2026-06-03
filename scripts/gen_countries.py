"""Generate frontend/src/constants/countries.ts from ISO 3166 names."""
from pathlib import Path

try:
    import pycountry

    rows = sorted((c.alpha_2, c.name) for c in pycountry.countries)
except ImportError:
    rows = sorted(
        [
            ("US", "United States"),
            ("GB", "United Kingdom"),
            ("CA", "Canada"),
            ("MX", "Mexico"),
            ("AU", "Australia"),
            ("DE", "Germany"),
            ("FR", "France"),
            ("ES", "Spain"),
            ("IT", "Italy"),
            ("JP", "Japan"),
            ("SE", "Sweden"),
            ("FI", "Finland"),
            ("NO", "Norway"),
            ("BR", "Brazil"),
            ("CO", "Colombia"),
            ("IE", "Ireland"),
            ("NL", "Netherlands"),
            ("BE", "Belgium"),
            ("AT", "Austria"),
            ("CH", "Switzerland"),
            ("PL", "Poland"),
            ("PT", "Portugal"),
            ("DK", "Denmark"),
            ("NZ", "New Zealand"),
            ("AR", "Argentina"),
            ("CL", "Chile"),
            ("KR", "Korea, Republic of"),
        ],
        key=lambda x: x[1],
    )

out = Path(__file__).resolve().parents[1] / "frontend" / "src" / "constants" / "countries.ts"
lines = [
    'export type Country = { code: string; name: string };',
    "",
    "export const COUNTRIES: Country[] = [",
]
for code, name in rows:
    safe = name.replace("\\", "\\\\").replace('"', '\\"')
    lines.append(f'  {{ code: "{code}", name: "{safe}" }},')

# UK nations — not separate ISO countries; use flag-icons subdivision codes.
EXTRA: list[tuple[str, str, str]] = [
    ("ENG", "England", "gb-eng"),
    ("SCT", "Scotland", "gb-sct"),
    ("WLS", "Wales", "gb-wls"),
]
for code, name, flag in EXTRA:
    safe = name.replace("\\", "\\\\").replace('"', '\\"')
    lines.append(f'  {{ code: "{code}", name: "{safe}", flag: "{flag}" }},')
lines += [
    "];",
    "",
    "const BY_NAME = new Map(COUNTRIES.map((c) => [c.name, c.code]));",
    "",
    "export function countryFlagEmoji(code: string): string {",
    '  const upper = code.trim().toUpperCase();',
    "  if (upper.length !== 2 || !/^[A-Z]{2}$/.test(upper)) return \"\\u{1F3F3}\\u{FE0F}\";",
    "  return String.fromCodePoint(",
    "    ...[...upper].map((ch) => 0x1f1e6 + ch.charCodeAt(0) - 65)",
    "  );",
    "}",
    "",
    "export function flagForCountryName(name: string): string {",
    "  const code = BY_NAME.get(name);",
    "  return code ? countryFlagEmoji(code) : \"\\u{1F3F3}\\u{FE0F}\";",
    "}",
    "",
    "export function countryNames(): string[] {",
    "  return COUNTRIES.map((c) => c.name);",
    "}",
    "",
]
out.write_text("\n".join(lines) + "\n", encoding="utf-8")
print(f"Wrote {len(rows)} countries to {out}")
