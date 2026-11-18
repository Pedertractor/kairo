import loginImage from '@/assets/new_logo.png';
import { KairoBrand } from '@/components/kairo-brand';
import { LoginForm } from '@/components/login-form';

export function LoginPage({ production = false }: { production?: boolean }) {
  return (
    <div className='grid min-h-svh bg-background lg:grid-cols-2'>
      <div className='flex flex-col px-6 py-7 sm:px-12 lg:px-14 lg:py-10 xl:px-20'>
        <div className='flex [&_a]:gap-2.5 [&_a]:text-xl [&_a]:tracking-tight [&_a>div]:size-9 [&_a>div]:rounded-xl [&_a>div]:bg-blue-700 [&_a>div]:text-white'>
          <KairoBrand />
        </div>
        <div className='flex flex-1 items-center justify-center py-12 sm:py-16'>
          <div className='w-full max-w-sm'>
            <LoginForm production={production} />
          </div>
        </div>
      </div>
      <div className='relative m-3 ml-0 hidden min-h-[640px] overflow-hidden rounded-[28px] bg-blue-100 lg:block'>
        <img
          src={loginImage}
          alt=''
          className='absolute inset-0 h-full w-full object-cover'
        />
        <div className='absolute inset-0 bg-linear-to-t from-[#061e4c]/95 via-[#0d3970]/5 to-transparent' />
        <div className='absolute inset-x-0 bottom-0 p-10 text-white xl:p-14'>
          <h2 className='max-w-md text-4xl leading-[1.1] font-semibold tracking-tight xl:text-5xl'>
            Cada momento<br />faz a diferença.
          </h2>
          <p className='mt-5 max-w-sm text-sm leading-relaxed text-blue-100/85'>
            Equipes, projetos e atividades no mesmo lugar. Tudo para transformar seu tempo em resultados.
          </p>
        </div>
      </div>
    </div>
  );
}
