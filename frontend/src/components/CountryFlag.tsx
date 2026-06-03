import { countryFlagClassForName } from "../constants/countries";

interface Props {
  name: string;
  className?: string;
  title?: string;
}

export default function CountryFlag({ name, className = "", title }: Props) {
  const flagClass = countryFlagClassForName(name);
  if (!flagClass) return null;
  return (
    <span
      className={`fi fi-${flagClass} country-flag ${className}`.trim()}
      title={title ?? name}
      aria-hidden
    />
  );
}

export function CountryLabel({ name }: { name: string }) {
  return (
    <>
      <CountryFlag name={name} />
      <span className="country-label-text">{name}</span>
    </>
  );
}
