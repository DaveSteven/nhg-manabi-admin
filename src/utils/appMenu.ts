import type { MenuItem } from "@/api/schemas";

/**
 * Built-in menu tree. Visibility is computed with {@link filterMenuTreeByPermissions}
 * from `GET /api/auth/permissions` (must stay consistent with route permission map below).
 */
export const APP_MENU_TREE: MenuItem[] = [
  {
    id: "g-platform",
    kind: "group",
    name: "平台",
    path: null,
    icon: "IconLucideSparkles",
    permissions: null,
    sort: 0,
    hidden: false,
    children: [
      {
        id: "1",
        kind: "item",
        name: "仪表盘",
        path: "/dashboard",
        icon: "IconLucideLayoutDashboard",
        children: null,
        permissions: null,
        sort: 0,
        hidden: false,
      },
      {
        id: "2",
        kind: "item",
        name: "用户管理",
        path: "/users",
        icon: "IconLucideUsers",
        children: null,
        permissions: ["user:view"],
        sort: 1,
        hidden: false,
      },
      {
        id: "2b",
        kind: "item",
        name: "真题校正",
        path: "/exam-questions",
        icon: "IconLucideClipboardCheck",
        children: null,
        permissions: ["user:view"],
        sort: 2,
        hidden: false,
      },
    ],
  },
];

function hasRequiredPermissions(
  required: string[] | null | undefined,
  granted: Set<string>,
): boolean {
  if (!required || required.length === 0) return true;
  return required.every((p) => granted.has(p));
}

export function filterMenuTreeByPermissions(
  nodes: MenuItem[],
  permissionList: string[],
): MenuItem[] {
  const granted = new Set(permissionList);

  const walk = (list: MenuItem[]): MenuItem[] =>
    list
      .map((node) => {
        if (!hasRequiredPermissions(node.permissions ?? null, granted)) return null;

        if (node.kind === "group") {
          const children = walk(node.children);
          if (children.length === 0) return null;
          return { ...node, children };
        }

        if (node.children?.length) {
          const children = walk(node.children);
          if (children.length === 0) return null;
          return { ...node, children };
        }

        return node;
      })
      .filter((n): n is MenuItem => n != null);

  return walk(nodes);
}

/** Normalized pathname (no trailing slash except `/`) */
export function normalizeAppPath(pathname: string): string {
  if (pathname === "/") return pathname;
  return pathname.replace(/\/+$/, "") || "/";
}

/**
 * Route → permission required to open the page. `null` = no permission gate.
 * Keep in sync with {@link APP_MENU_TREE} paths.
 */
export function requiredPermissionForPath(pathname: string): string | null {
  const p = normalizeAppPath(pathname);
  const map: Record<string, string | null> = {
    "/dashboard": null,
    "/users": "user:view",
    "/exam-questions": "user:view",
    "/403": null,
  };
  return map[p] ?? null;
}

export function canAccessPath(pathname: string, permissions: string[] | undefined): boolean {
  const required = requiredPermissionForPath(pathname);
  if (required == null) return true;
  if (!permissions?.length) return false;
  return permissions.includes(required);
}
