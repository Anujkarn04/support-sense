import { MobileAccountBar } from "./Layout.jsx";

export default function PageHeader({ title, children, actions }) {
  return (
    <>
      <MobileAccountBar />
      <header className="flex flex-wrap items-end justify-between gap-3 px-5 pb-3 pt-6 md:px-8">
        <div className="min-w-0">
          <h1 className="text-3xl">{title}</h1>
          {children && <p className="mt-1 max-w-2xl text-muted">{children}</p>}
        </div>
        {actions}
      </header>
    </>
  );
}
