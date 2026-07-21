export function SearchToolbar({
  values,
}: {
  values: Record<string, string | undefined>;
}) {
  const hasAdvancedFilters = Boolean(
    values.year ||
      values.region ||
      values.edition ||
      values.scoreMin ||
      values.scoreMax ||
      values.cover ||
      values.sort ||
      values.dir,
  );

  return (
    <form className="toolbar" method="get">
      <label className="search-shell">
        Søk
        <input
          name="q"
          defaultValue={values.q}
          placeholder="Tittel, utgave eller merknad"
        />
      </label>

      <details className="advanced-search" open={hasAdvancedFilters}>
        <summary>
          <span>Flere filtre og sortering</span>
          <span className="chevron" aria-hidden="true" />
        </summary>

        <div className="advanced-search-content">
          <div className="filters">
            <label>
              År
              <input name="year" type="number" defaultValue={values.year} />
            </label>
            <label>
              Region
              <input
                name="region"
                defaultValue={values.region}
                placeholder="2, PAL, All…"
              />
            </label>
            <label>
              Utgave
              <input name="edition" defaultValue={values.edition} />
            </label>
            <label>
              Min. IMDb
              <input
                name="scoreMin"
                type="number"
                min="0"
                max="10"
                step="0.1"
                defaultValue={values.scoreMin}
              />
            </label>
            <label>
              Maks. IMDb
              <input
                name="scoreMax"
                type="number"
                min="0"
                max="10"
                step="0.1"
                defaultValue={values.scoreMax}
              />
            </label>
            <label>
              Cover
              <select name="cover" defaultValue={values.cover || ""}>
                <option value="">Alle</option>
                <option value="yes">Har cover</option>
                <option value="no">Mangler cover</option>
              </select>
            </label>
            <label>
              Sorter
              <select name="sort" defaultValue={values.sort || "created_at"}>
                <option value="created_at">Registrert</option>
                <option value="updated_at">Sist endret</option>
                <option value="original_title">Originaltittel</option>
                <option value="alternative_title">Alternativ tittel</option>
                <option value="release_year">År</option>
                <option value="imdb_score">IMDb</option>
              </select>
            </label>
            <label>
              Retning
              <select name="dir" defaultValue={values.dir || "desc"}>
                <option value="asc">Stigende</option>
                <option value="desc">Synkende</option>
              </select>
            </label>
          </div>
        </div>
      </details>

      <div className="actions toolbar-actions">
        <button className="primary" type="submit">
          Søk
        </button>
        <a className="button" href="/">
          Nullstill
        </a>
      </div>
    </form>
  );
}
