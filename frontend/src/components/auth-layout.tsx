import type { ReactNode } from 'react';

import loginImage from '@/assets/new_logo.png';
import { KairoBrand } from '@/components/kairo-brand';

/**
 * Shared shell for the unauthenticated screens (login, production login, first-access password change).
 * On large screens the page is locked to the viewport: the illustration stays fixed and only the
 * form column scrolls, so nothing is cut off on short laptop screens.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className='grid min-h-svh bg-background lg:h-svh lg:grid-cols-2 lg:overflow-hidden'>
      <div className='flex min-h-0 flex-col overflow-y-auto px-6 py-6 sm:px-12 lg:px-14 lg:py-8 xl:px-20 [@media(max-height:760px)]:lg:py-5'>
        <div className='flex shrink-0 [&_a]:gap-2.5 [&_a]:text-xl [&_a]:tracking-tight [&_a>div]:size-9 [&_a>div]:rounded-xl [&_a>div]:bg-blue-700 [&_a>div]:text-white'>
          <KairoBrand />
        </div>
        {/* my-auto (instead of items-center) keeps the form vertically centered without clipping its top when it overflows. */}
        <div className='flex w-full flex-1 justify-center py-8 sm:py-10 [@media(max-height:760px)]:py-5'>
          <div className='my-auto w-full max-w-sm'>{children}</div>
        </div>
      </div>
      <div className='relative m-3 ml-0 hidden overflow-hidden rounded-[28px] bg-blue-100 lg:block'>
        <img src={loginImage} alt='' className='absolute inset-0 h-full w-full object-cover' />
        <div className='absolute inset-0 bg-linear-to-t from-[#061e4c]/95 via-[#0d3970]/5 to-transparent' />
        <div className='absolute inset-x-0 bottom-0 p-10 text-white xl:p-14 [@media(max-height:760px)]:p-8'>
          <h2 className='max-w-md text-4xl leading-[1.1] font-semibold tracking-tight xl:text-5xl [@media(max-height:760px)]:text-3xl'>
            Cada momento<br />faz a diferença.
          </h2>
          <p className='mt-5 max-w-sm text-sm leading-relaxed text-blue-100/85 [@media(max-height:760px)]:mt-3'>
            Equipes, projetos e atividades no mesmo lugar. Tudo para transformar seu tempo em resultados.
          </p>
        </div>
      </div>
    </div>
  );
}
