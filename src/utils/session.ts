import { httpClient } from "@/utils/http";
import { AUTH_ENDPOINTS } from "@/api/auth";
import { SessionUserSchema, toSessionUser } from "@/api/schemas";
import { APP_MENU_TREE, filterMenuTreeByPermissions } from "@/utils/appMenu";
import { useAuthStore } from "@/stores/auth";

/**
 * Fetches `/api/me` (real backend session user), derives permissions from
 * `is_admin`, then updates `user` and sidebar `menus`.
 */
export async function fetchSessionAndApplyToStore(): Promise<void> {
  const base = await httpClient.get(AUTH_ENDPOINTS.me).then((d) => SessionUserSchema.parse(d));
  const user = toSessionUser(base);
  const menus = filterMenuTreeByPermissions(APP_MENU_TREE, user.permissions);
  const { setUser, setMenus } = useAuthStore.getState();
  setUser(user);
  setMenus(menus);
}
