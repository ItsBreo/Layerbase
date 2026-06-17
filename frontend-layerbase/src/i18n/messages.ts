/**
 * Diccionarios de traducción (ES / EN).
 *
 * Claves anidadas por área. El eslogan de marca ("Lay the foundation. Ship the
 * product.") NO se traduce: es el lema oficial en inglés en ambos idiomas.
 * Se accede con dot-path: t('home.subtitle'). Soporta interpolación {param}.
 */

export type Lang = 'es' | 'en'

export const LANGS: Lang[] = ['es', 'en']

export const messages = {
  es: {
    top: {
      login: 'Iniciar sesión',
      register: 'Crear cuenta',
      logout: 'Cerrar sesión',
    },
    nav: {
      home: 'Inicio',
      dashboard: 'Panel',
      admin: 'Admin',
    },
    theme: {
      toLight: 'Cambiar a modo claro',
      toDark: 'Cambiar a modo oscuro',
    },
    home: {
      subtitle:
        'El marketplace de componentes UI donde tú decides el precio. Publica gratis, acepta donativos o cobra lo que mereces. React, Angular y Vanilla JS.',
      ctaStart: 'Empezar gratis',
      ctaLogin: 'Iniciar sesión',
      ctaDashboard: 'Ir a mi panel',
      ctaExplore: 'Explorar componentes',
      builtWith: 'Construido con',
    },
    dashboard: {
      eyebrow: 'Tu panel',
      greeting: 'Hola, {name}',
      subtitle: 'Gestiona tu cuenta y tus componentes desde aquí.',
      email: 'Email',
      role: 'Rol',
      emailVerified: 'Email verificado',
      stripe: 'Stripe',
      yes: 'Sí',
      pending: 'Pendiente',
      connected: 'Conectado',
      notConnected: 'Sin conectar',
      roles: { user: 'Comprador', author: 'Autor', admin: 'Administrador' },
    },
    admin: {
      badge: 'Administración',
      title: 'Panel de admin',
      body: 'Moderación de componentes, gestión de usuarios y métricas. (Se construirá en la semana S4 del roadmap.)',
    },
    notFound: {
      title: 'Página no encontrada',
      body: 'La página que buscas no existe o se ha movido.',
      back: 'Volver al inicio',
    },
    auth: {
      orEmail: 'o continúa con email',
      email: 'Email',
      password: 'Contraseña',
      passwordConfirm: 'Repite la contraseña',
      name: 'Nombre',
      login: {
        title: 'Inicia sesión',
        subtitle: 'Accede a tu cuenta de Layerbase',
        submit: 'Entrar',
        forgot: '¿Olvidaste tu contraseña?',
        footerText: '¿No tienes cuenta?',
        footerLink: 'Crea una',
        success: 'Sesión iniciada',
        error: 'No se pudo iniciar sesión',
      },
      register: {
        title: 'Crea tu cuenta',
        subtitle: 'Únete a Layerbase y empieza a publicar o comprar componentes',
        submit: 'Crear cuenta',
        footerText: '¿Ya tienes cuenta?',
        footerLink: 'Inicia sesión',
        success: 'Cuenta creada. ¡Bienvenido!',
        error: 'No se pudo crear la cuenta',
      },
      forgot: {
        title: 'Recupera tu contraseña',
        subtitle: 'Te enviaremos un enlace para crear una nueva',
        submit: 'Enviar enlace',
        back: 'Volver al inicio de sesión',
        sent: 'Si el email existe, recibirás un enlace en breve. Revisa tu bandeja de entrada.',
      },
      reset: {
        title: 'Nueva contraseña',
        subtitle: 'Restableciendo el acceso de {email}',
        newPassword: 'Nueva contraseña',
        submit: 'Guardar contraseña',
        success: 'Contraseña actualizada. Ya puedes iniciar sesión.',
        invalidTitle: 'Enlace no válido',
        invalidSubtitle: 'Falta el token o el email del enlace de recuperación',
        invalidLink: 'Solicitar un enlace nuevo',
      },
      oauth: {
        loading: 'Completando el inicio de sesión…',
        success: 'Sesión iniciada',
        errorGeneric: 'No se pudo iniciar sesión.',
        errorProvider: 'No se pudo completar el inicio con el proveedor.',
        errorBanned: 'Tu cuenta está suspendida.',
        errorToken: 'Falta el token de autenticación.',
        errorSession: 'No se pudo validar la sesión.',
      },
      validation: {
        emailRequired: 'El email es obligatorio',
        passwordRequired: 'La contraseña es obligatoria',
        nameRequired: 'El nombre es obligatorio',
        passwordMin: 'Mínimo 8 caracteres',
        passwordConfirm: 'Confirma la contraseña',
        passwordMismatch: 'Las contraseñas no coinciden',
      },
    },
    common: {
      logoutSuccess: 'Has cerrado sesión',
      error: 'Algo salió mal. Inténtalo de nuevo.',
    },
  },

  en: {
    top: {
      login: 'Sign in',
      register: 'Sign up',
      logout: 'Sign out',
    },
    nav: {
      home: 'Home',
      dashboard: 'Dashboard',
      admin: 'Admin',
    },
    theme: {
      toLight: 'Switch to light mode',
      toDark: 'Switch to dark mode',
    },
    home: {
      eyebrow: 'UI components marketplace',
      subtitle:
        'The UI components marketplace where you set the price. Publish for free, accept donations or charge what you deserve. React, Angular and Vanilla JS.',
      ctaStart: 'Get started free',
      ctaLogin: 'Sign in',
      ctaDashboard: 'Go to dashboard',
      ctaExplore: 'Explore components',
      builtWith: 'Built with',
    },
    dashboard: {
      eyebrow: 'Your dashboard',
      greeting: 'Hi, {name}',
      subtitle: 'Manage your account and components from here.',
      email: 'Email',
      role: 'Role',
      emailVerified: 'Email verified',
      stripe: 'Stripe',
      yes: 'Yes',
      pending: 'Pending',
      connected: 'Connected',
      notConnected: 'Not connected',
      roles: { user: 'Buyer', author: 'Author', admin: 'Administrator' },
    },
    admin: {
      badge: 'Administration',
      title: 'Admin panel',
      body: 'Component moderation, user management and metrics. (To be built in week S4 of the roadmap.)',
    },
    notFound: {
      title: 'Page not found',
      body: 'The page you’re looking for doesn’t exist or has moved.',
      back: 'Back to home',
    },
    auth: {
      orEmail: 'or continue with email',
      email: 'Email',
      password: 'Password',
      passwordConfirm: 'Repeat password',
      name: 'Name',
      login: {
        title: 'Sign in',
        subtitle: 'Access your Layerbase account',
        submit: 'Sign in',
        forgot: 'Forgot your password?',
        footerText: 'Don’t have an account?',
        footerLink: 'Create one',
        success: 'Signed in',
        error: 'Couldn’t sign in',
      },
      register: {
        title: 'Create your account',
        subtitle: 'Join Layerbase and start publishing or buying components',
        submit: 'Create account',
        footerText: 'Already have an account?',
        footerLink: 'Sign in',
        success: 'Account created. Welcome!',
        error: 'Couldn’t create the account',
      },
      forgot: {
        title: 'Recover your password',
        subtitle: 'We’ll send you a link to create a new one',
        submit: 'Send link',
        back: 'Back to sign in',
        sent: 'If the email exists, you’ll receive a link shortly. Check your inbox.',
      },
      reset: {
        title: 'New password',
        subtitle: 'Resetting access for {email}',
        newPassword: 'New password',
        submit: 'Save password',
        success: 'Password updated. You can now sign in.',
        invalidTitle: 'Invalid link',
        invalidSubtitle: 'The recovery link is missing the token or email',
        invalidLink: 'Request a new link',
      },
      oauth: {
        loading: 'Completing sign in…',
        success: 'Signed in',
        errorGeneric: 'Couldn’t sign in.',
        errorProvider: 'Couldn’t complete sign in with the provider.',
        errorBanned: 'Your account is suspended.',
        errorToken: 'Missing authentication token.',
        errorSession: 'Couldn’t validate the session.',
      },
      validation: {
        emailRequired: 'Email is required',
        passwordRequired: 'Password is required',
        nameRequired: 'Name is required',
        passwordMin: 'At least 8 characters',
        passwordConfirm: 'Confirm the password',
        passwordMismatch: 'Passwords don’t match',
      },
    },
    common: {
      logoutSuccess: 'You’ve signed out',
      error: 'Something went wrong. Please try again.',
    },
  },
} as const
