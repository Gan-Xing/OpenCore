import component from './en-US/component';
import errors from './en-US/errors';
import globalHeader from './en-US/globalHeader';
import menu from './en-US/menu';
import network from './en-US/network';
import pages from './en-US/pages';
import settingDrawer from './en-US/settingDrawer';

export default {
  'navBar.lang': 'Languages',
  'layout.user.link.help': 'Help',
  'layout.user.link.privacy': 'Privacy',
  'layout.user.link.terms': 'Terms',
  'app.preview.down.block': 'Download this page to your local project',
  ...globalHeader,
  ...menu,
  ...settingDrawer,
  ...network,
  ...component,
  ...pages,
  ...errors,
};
