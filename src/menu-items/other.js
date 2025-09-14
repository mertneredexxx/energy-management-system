// assets
import { IconBrandChrome, IconHelp, IconClipboardList } from '@tabler/icons-react';

// constant
const icons = { IconBrandChrome, IconHelp, IconClipboardList };

// ==============================|| SAMPLE PAGE & DOCUMENTATION MENU ITEMS ||============================== //

const other = {
  id: 'sample-docs-roadmap',
  type: 'group',
  children: [
    {
      id: 'survey',
      title: 'Feedback & Surveys',
      type: 'item',
      url: '/survey',
      icon: icons.IconClipboardList,
      breadcrumbs: false
    }
  ]
};

export default other;
