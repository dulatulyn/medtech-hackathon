// Reusable loading skeletons (presentational only).
// Styling lives in styles/app.css: .skeleton / .skeleton--text / .skeleton--num / .skeleton-row
// The shimmer is GPU-friendly (animates background-position only).

// numbers become px, strings pass through untouched ('60%', '3rem', etc.)
const size = (v) => (typeof v === 'number' ? `${v}px` : v)

/**
 * A single placeholder block.
 *   <Skeleton w={120} h={14} r="999px" />
 *   <Skeleton w="40%" h="2.2rem" />
 * Props: w(idth), h(eight), r(adius) — all optional, plus className/style passthrough.
 */
export function Skeleton({ w, h = '0.9rem', r, className = '', style, ...rest }) {
  return (
    <span
      className={`skeleton ${className}`.trim()}
      style={{ width: size(w), height: size(h), borderRadius: size(r), ...style }}
      aria-hidden="true"
      {...rest}
    />
  )
}

/**
 * Placeholder rows for a <table className="table">.
 * Drop straight into <tbody>:  {loading ? <SkeletonRows n={6} cols={5} /> : rows}
 * The last column is rendered narrow (.skeleton--num) to mirror numeric cells.
 * Props: n (row count, default 5), cols (column count, default 4).
 */
export function SkeletonRows({ n = 5, cols = 4 }) {
  return (
    <>
      {Array.from({ length: n }).map((_, ri) => (
        <tr className="skeleton-row" key={ri}>
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci}>
              <span className={`skeleton skeleton--text${ci === cols - 1 ? ' skeleton--num' : ''}`} aria-hidden="true" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export default Skeleton
