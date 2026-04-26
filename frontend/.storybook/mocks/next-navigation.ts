export const useRouter = () => ({
  push: () => {},
  replace: () => {},
  back: () => {},
  forward: () => {},
  prefetch: () => {},
  refresh: () => {},
});

export const usePathname = () => "/";

export const useSearchParams = () => new URLSearchParams();

export const useParams = () => ({});

export const redirect = () => {};
export const notFound = () => {};
