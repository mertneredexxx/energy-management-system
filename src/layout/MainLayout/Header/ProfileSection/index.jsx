/* eslint-disable prettier/prettier */
import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import ClickAwayListener from '@mui/material/ClickAwayListener';
import Paper from '@mui/material/Paper';
import Popper from '@mui/material/Popper';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import MainCard from 'ui-component/cards/MainCard';
import Transitions from 'ui-component/extended/Transitions';
import useConfig from 'hooks/useConfig';
import { supabase } from '../../../../api/supabaseClient';
import User1 from 'assets/images/users/user-round.svg';
import { IconSettings } from '@tabler/icons-react';

export default function ProfileSection() {
  const theme = useTheme();
  const { borderRadius } = useConfig();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef(null);

  // new: hold the actual user name (and maybe email/role)
  const [profile, setProfile] = useState({
    fullName: '',
    email: '',
    role: ''
  });

  // fetch the supabase user on mount
  useEffect(() => {
    (async () => {
      const {
        data: { user },
        error
      } = await supabase.auth.getUser();
      if (error || !user) return;
      // try to read a full_name or name from user_metadata, fallback to email
      const fullName =
        user.user_metadata?.first_name ||
        user.user_metadata?.name ||
        user.email ||
        '';
      // you could also fetch a profile table for a role, etc.
      setProfile({ fullName, email: user.email, role: 'Project Admin' });
    })();
  }, []);

  const handleToggle = () => {
    setOpen(prev => !prev);
  };
  const handleClose = e => {
    if (anchorRef.current?.contains(e.target)) return;
    setOpen(false);
  };

  // restore focus when closing
  const prevOpen = useRef(open);
  useEffect(() => {
    if (prevOpen.current && !open) {
      anchorRef.current.focus();
    }
    prevOpen.current = open;
  }, [open]);

  return (
    <>
      <Chip
        sx={{
          ml: 2,
          height: '48px',
          alignItems: 'center',
          borderRadius: '27px',
          '& .MuiChip-label': { lineHeight: 0 }
        }}
        icon={
          <Avatar
            src={User1}
            alt={profile.fullName}
            sx={{
              ...theme.typography.mediumAvatar,
              margin: '8px 0 8px 8px !important',
              cursor: 'pointer'
            }}
            ref={anchorRef}
            aria-controls={open ? 'profile-menu' : undefined}
            aria-haspopup="true"
            color="inherit"
          />
        }
        label={<IconSettings stroke={1.5} size="24px" />}
        ref={anchorRef}
        aria-controls={open ? 'profile-menu' : undefined}
        aria-haspopup="true"
        onClick={handleToggle}
        color="primary"
        aria-label="user-account"
      />

      <Popper
        id="profile-menu"
        open={open}
        anchorEl={anchorRef.current}
        transition
        disablePortal
        placement="bottom-end"
        modifiers={[{ name: 'offset', options: { offset: [0, 14] } }]}
      >
        {({ TransitionProps }) => (
          <ClickAwayListener onClickAway={handleClose}>
            <Transitions in={open} {...TransitionProps}>
              <Paper>
                <MainCard
                  border={false}
                  elevation={16}
                  content={false}
                  boxShadow={theme.shadows[16]}
                >
                  <Box sx={{ p: 2, pb: 0 }}>
                    <Box sx={{ mb: 1 }}>
                      <Typography variant="h4">
                        Good Morning,
                      </Typography>
                        {profile.fullName}
                    </Box>
                    <Typography variant="subtitle2" color="textSecondary">
                      {profile.role}
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {profile.email}
                    </Typography>
                  </Box>
                  <Divider />
                  {/* …add menu items here… */}
                </MainCard>
              </Paper>
            </Transitions>
          </ClickAwayListener>
        )}
      </Popper>
    </>
  );
}
