/** Google Material Symbol, by name. The icons are loaded in index.html. */
export function Icon({ name }: { name: string }) {
  return (
    <span className="icon" aria-hidden="true">
      {name}
    </span>
  )
}
