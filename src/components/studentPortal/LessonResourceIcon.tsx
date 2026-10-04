const paths = {
  video: 'm9 6 10 6-10 6Z',
  notes: 'M6 3h9l4 4v14H6ZM14 3v5h5M9 12h7M9 16h5',
  practice: 'm15 5 4 4M4 20l4-1L20 7a2.8 2.8 0 0 0-4-4L4 15Z',
  attend: 'm5 12 4 4L19 6',
}

export default function LessonResourceIcon({ kind }: { kind: keyof typeof paths }) {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]} /></svg>
}
