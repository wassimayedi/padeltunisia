import { Fragment } from "react";

import { areaCities, GOVERNORATES, GRAND_TUNIS, type CityGroup } from "@/lib/clubs";

const indent = (name: string) => `\u00a0\u00a0\u00a0${name}`;

/**
 * The <option>s of every "Ville" select: cities grouped by region. With `areas`, Grand Tunis also
 * offers the whole region and each governorate ("Tunis" covers La Marsa, La Goulette…), with that
 * governorate's other cities indented below it. Without, only real cities.
 */
export function CityOptions({ groups, areas = true }: { groups: CityGroup[]; areas?: boolean }) {
  return groups.map(({ region, cities }) => {
    if (!areas || region !== GRAND_TUNIS) return <optgroup key={region} label={region}>{cities.map((c) => <option key={c} value={c}>{c}</option>)}</optgroup>;
    const governorates = Object.keys(GOVERNORATES).filter((g) => cities.some((c) => areaCities(g).includes(c)));
    const loose = cities.filter((c) => !governorates.some((g) => areaCities(g).includes(c)));
    return (
      <optgroup key={region} label={region}>
        <option value={GRAND_TUNIS}>Grand Tunis</option>
        {governorates.map((g) => (
          <Fragment key={g}>
            <option value={g}>{g}</option>
            {cities.filter((c) => c !== g && areaCities(g).includes(c)).map((c) => <option key={c} value={c}>{indent(c)}</option>)}
          </Fragment>
        ))}
        {loose.map((c) => <option key={c} value={c}>{c}</option>)}
      </optgroup>
    );
  });
}
