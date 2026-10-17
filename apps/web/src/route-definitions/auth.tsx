import { lazyRoute } from '@app/lib/router/lazyRoute';
import { AUTH_LAYOUT_ROUTE_ID } from '@app/lib/router/routeData';
import { Route } from 'react-router';
import { title } from './handles';
export const authRoutes = (
  <Route
    id={AUTH_LAYOUT_ROUTE_ID}
    lazy={lazyRoute(() => import('@app/routes/auth/layout'))}
  >
    <Route
      path="/login"
      lazy={lazyRoute(() => import('@app/routes/login/route'))}
      handle={title('【登录】')}
    />
    <Route
      path="/sso/callback"
      lazy={lazyRoute(() => import('@app/routes/sso/callback/route'))}
      handle={title('【登录】')}
    />
  </Route>
);
