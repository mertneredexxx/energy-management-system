import { 
  IconTypography, 
  IconPalette, 
  IconShadow, 
  IconWindmill,
  IconChartBar,    // for graphs
  IconDeviceLaptop, // for chosen devices (optional alternative)
  IconHome         // for home settings (optional alternative)
} from '@tabler/icons-react';

const icons = {
  IconTypography,
  IconPalette,
  IconShadow,
  IconWindmill,
  IconChartBar,    // added icon for graphs
  IconDeviceLaptop,
  IconHome
};

const utilities = {
  id: 'analyses',
  title: 'Analyses',
  type: 'group',
  children: [
    {
      id: 'current-info',
      title: 'Current Information',
      type: 'item',
      url: '/current-info',
      icon: icons.IconDeviceLaptop,   // or you might try icons.IconDeviceLaptop
      breadcrumbs: false
    },
    {
      id: 'graphs',
      title: 'Graphs',
      type: 'item',
      url: '/graphs',
      icon: icons.IconChartBar,  // using the suggested icon for graphs
      breadcrumbs: false
    },
    {
      id: 'selected-devices',
      title: 'Loads',
      type: 'item',
      url: '/loads',
      icon: icons.IconDeviceLaptop,   // or you might try icons.IconDeviceLaptop
      breadcrumbs: false
    },
    {
      id: 'home-settings',
      title: 'Home Settings',
      type: 'item',
      url: '/home-settings',
      icon: icons.IconShadow,   // or consider icons.IconHome / icons.IconSettings
      breadcrumbs: false
    }
  ]
};

export default utilities;
