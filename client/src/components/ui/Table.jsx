export function Table({ children, className = '' }) {
  return (
    <div className="overflow-x-auto">
      <table className={`w-full min-w-[36rem] border-collapse text-left text-sm ${className}`}>
        {children}
      </table>
    </div>
  );
}

export function Th({ children, className = '' }) {
  return (
    <th
      scope="col"
      className={`border-b border-line bg-paper/70 px-5 py-2.5 text-[12px] font-semibold text-muted ${className}`}
    >
      {children}
    </th>
  );
}

export function Td({ children, className = '' }) {
  return <td className={`border-b border-line/70 px-5 py-3 align-middle ${className}`}>{children}</td>;
}

export function Tr({ children, className = '' }) {
  return <tr className={`transition-colors hover:bg-paper/60 ${className}`}>{children}</tr>;
}
