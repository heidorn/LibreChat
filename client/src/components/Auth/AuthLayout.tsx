import { ThemeSelector } from '@librechat/client';
import { TStartupConfig } from 'librechat-data-provider';
import { ErrorMessage } from '~/components/Auth/ErrorMessage';
import { TranslationKeys, useLocalize } from '~/hooks';
import SocialLoginRender from './SocialLoginRender';
import { BlinkAnimation } from './BlinkAnimation';
import { Banner } from '../Banners';
import Footer from './Footer';

function AuthLayout({
  children,
  header,
  isFetching,
  startupConfig,
  startupConfigError,
  pathname,
  error,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
  isFetching: boolean;
  startupConfig: TStartupConfig | null | undefined;
  startupConfigError: unknown | null | undefined;
  pathname: string;
  error: TranslationKeys | null;
}) {
  const localize = useLocalize();

  const hasStartupConfigError = startupConfigError !== null && startupConfigError !== undefined;
  const DisplayError = () => {
    if (hasStartupConfigError) {
      return (
        <div className="mx-auto sm:max-w-sm">
          <ErrorMessage>{localize('com_auth_error_login_server')}</ErrorMessage>
        </div>
      );
    } else if (error === 'com_auth_error_invalid_reset_token') {
      return (
        <div className="mx-auto sm:max-w-sm">
          <ErrorMessage>
            {localize('com_auth_error_invalid_reset_token')}{' '}
            <a className="font-semibold text-green-600 hover:underline" href="/forgot-password">
              {localize('com_auth_click_here')}
            </a>{' '}
            {localize('com_auth_to_try_again')}
          </ErrorMessage>
        </div>
      );
    } else if (error != null && error) {
      return (
        <div className="mx-auto sm:max-w-sm">
          <ErrorMessage>{localize(error)}</ErrorMessage>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="lph-auth-page relative flex min-h-screen flex-col overflow-hidden">
      <Banner />
      <BlinkAnimation active={isFetching}>
        <div className="relative z-10 mt-7 flex w-full justify-center">
          <div className="lph-auth-brand flex items-center gap-3">
            <img
              src="assets/leads-per-hour/icon.png"
              className="h-9 w-9 rounded-lg"
              alt=""
              aria-hidden="true"
            />
            <div>
              <div className="lph-brand-font text-xl font-semibold leading-none text-[var(--lph-text)]">
                Leads Per Hour
              </div>
              <div className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.22em] text-[var(--lph-orange)]">
                AI Workspace
              </div>
            </div>
          </div>
        </div>
      </BlinkAnimation>
      <DisplayError />
      <div className="absolute bottom-0 left-0 z-10 md:m-4">
        <ThemeSelector />
      </div>

      <main className="relative z-10 flex flex-grow items-center justify-center px-4 py-10">
        <div className="lph-auth-card w-full max-w-md overflow-hidden px-7 py-7 sm:px-8">
          {!hasStartupConfigError && !isFetching && header && (
            <h1
              className="lph-brand-font mb-2 text-center text-4xl font-semibold text-[var(--lph-text)]"
              style={{ userSelect: 'none' }}
            >
              {header}
            </h1>
          )}
          {!hasStartupConfigError && !isFetching && (
            <p className="mb-6 text-center text-sm text-[var(--lph-text-muted)]">
              Entre para continuar seu trabalho no Leads Per Hour.
            </p>
          )}
          {children}
          {!pathname.includes('2fa') &&
            (pathname.includes('login') || pathname.includes('register')) && (
              <SocialLoginRender startupConfig={startupConfig} />
            )}
        </div>
      </main>
      <Footer startupConfig={startupConfig} />
    </div>
  );
}

export default AuthLayout;
