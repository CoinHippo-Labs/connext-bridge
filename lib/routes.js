import { split } from './utils'

export const routes = [
  { pathname: '/' },
  { pathname: '/[bridge]' },
  { pathname: '/pools' },
  { pathname: '/pool' },
  { pathname: '/pool/[pool]' },
  { pathname: '/swap' },
  { pathname: '/swap/[swap]' },
]

export const isRouteExist = pathname =>
  routes.findIndex((r, i) => {
    if (r.pathname === pathname)
      return true

    const route_paths = split(r.pathname, 'lower', '/')
    const paths = split(pathname, 'lower', '/')

    if (route_paths.length === paths.length) {
      return route_paths.findIndex((p, j) => !(p.startsWith('[') && p.endsWith(']')) && p !== paths[j]) < 0
    }

    return false
  }) > -1