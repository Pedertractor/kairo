/** Shared input style for the auth screens (login, production login, first-access password change). */
export const AUTH_INPUT_CLASS = 'h-11 rounded-xl bg-background shadow-xs transition-shadow [@media(max-height:760px)]:h-10';

/** Shared primary button style for the auth screens. */
export const AUTH_SUBMIT_CLASS = 'h-11 w-full rounded-xl bg-blue-700 text-sm font-semibold text-white shadow-sm shadow-blue-700/15 transition-all hover:bg-blue-800 hover:shadow-md [@media(max-height:760px)]:h-10';

export function AuthHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className='space-y-2.5 [@media(max-height:760px)]:space-y-1.5'>
      <p className='text-xs font-semibold tracking-[0.16em] text-blue-700 uppercase dark:text-blue-400'>{eyebrow}</p>
      <h1 className='text-3xl leading-tight font-semibold tracking-tight sm:text-[32px] [@media(max-height:760px)]:text-2xl'>{title}</h1>
      <p className='text-sm leading-relaxed text-muted-foreground'>{description}</p>
    </div>
  );
}
