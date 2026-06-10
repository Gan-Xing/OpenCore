import {
  createLayoutMenuItems,
  registrySummary,
  shellMenuItems,
  shellPermissionCodes,
  type ShellMenuItem,
} from './core/shellRegistry';

type InitialState = {
  name: string;
  permissions: string[];
  menuItems: readonly ShellMenuItem[];
  registrySummary: typeof registrySummary;
};

export async function getInitialState(): Promise<InitialState> {
  return {
    name: 'OpenCore Admin',
    permissions: shellPermissionCodes,
    menuItems: shellMenuItems,
    registrySummary,
  };
}

export const layout = ({
  initialState,
}: {
  initialState?: InitialState;
} = {}) => {
  return {
    title: 'OpenCore Admin',
    layout: 'mix',
    menu: {
      locale: false,
    },
    menuDataRender: () =>
      createLayoutMenuItems(initialState?.menuItems ?? shellMenuItems),
    rightContentRender: false,
  };
};
