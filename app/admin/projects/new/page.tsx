import NewProjectForm from './NewProjectForm'

const mono = { fontFamily: 'var(--font-mono, ui-monospace, monospace)' }

export default function NewProjectPage() {
  return (
    <div className="px-6 md:px-10 py-10">
      <p
        className="text-[10px] tracking-[0.15em] uppercase mb-2"
        style={{ ...mono, color: 'var(--text-dim)' }}
      >
        New project
      </p>
      <h1
        className="font-black uppercase leading-none mb-10"
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(36px, 5vw, 56px)',
          letterSpacing: '-0.03em',
          color: 'var(--text-primary)',
        }}
      >
        Create
      </h1>
      <NewProjectForm />
    </div>
  )
}
