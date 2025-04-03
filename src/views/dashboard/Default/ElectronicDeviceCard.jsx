import PropTypes from 'prop-types';
import React from 'react';

// material-ui
import { useTheme } from '@mui/material/styles';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid2';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import MainCard from 'ui-component/cards/MainCard';
import SkeletonTotalOrderCard from 'ui-component/cards/Skeleton/EarningCard';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import GetAppTwoToneIcon from '@mui/icons-material/GetAppOutlined';
import FileCopyTwoToneIcon from '@mui/icons-material/FileCopyOutlined';
import PictureAsPdfTwoToneIcon from '@mui/icons-material/PictureAsPdfOutlined';
import ArchiveTwoToneIcon from '@mui/icons-material/ArchiveOutlined';
// assets
import AddIcon from '@mui/icons-material/Add';
import { IconButton, Modal } from '@mui/material';

export default function ElectronicDeviceCard({ isLoading, search, link, powerInfo }) {
  const theme = useTheme();

  const [timeValue, setTimeValue] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [anchorEl, setAnchorEl] = React.useState(null);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };
  const handleChangeTime = (event, newValue) => {
    setTimeValue(newValue);
  };

  return (
    <>
      {isLoading ? (
        <SkeletonTotalOrderCard />
      ) : (
        <>
          <Modal open={open} onClose={() => setOpen(false)}>
            <Box
              sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 500,
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: 24,
                p: 3,
                maxHeight: '80vh',
                overflowY: 'auto'
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Description</Typography>
                <IconButton onClick={() => setOpen(false)}></IconButton>
              </Box>
              <ul>
                {powerInfo?.map((info, idx) => (
                  <li key={idx}>
                    <Typography variant="body2" sx={{ mb: 1 }}>
                      {info}
                    </Typography>
                  </li>
                ))}
              </ul>
            </Box>
          </Modal>
          <MainCard
            border={false}
            content={false}
            sx={{
              bgcolor: 'primary.dark',
              color: '#fff',
              overflow: 'hidden',
              position: 'relative',
              '&>div': {
                position: 'relative',
                zIndex: 5
              },
              '&:after': {
                content: '""',
                position: 'absolute',
                width: 210,
                height: 210,
                background: theme.palette.primary[800],
                borderRadius: '50%',
                top: { xs: -85 },
                right: { xs: -95 }
              },
              '&:before': {
                content: '""',
                position: 'absolute',
                width: 210,
                height: 210,
                background: theme.palette.primary[800],
                borderRadius: '50%',
                top: { xs: -125 },
                right: { xs: -15 },
                opacity: 0.5
              }
            }}
          >
            <Box sx={{ p: 2.25 }}>
              <Grid container direction="column">
                <Grid>
                  <Grid container sx={{ justifyContent: 'space-between' }}>
                    <Grid>
                      <Avatar
                        variant="rounded"
                        sx={{
                          ...theme.typography.commonAvatar,
                          ...theme.typography.largeAvatar,
                          bgcolor: 'primary.800',
                          color: '#fff',
                          mt: 1
                        }}
                      >
                        <AddIcon fontSize="inherit" />
                      </Avatar>
                    </Grid>
                    <Grid>
                      <Avatar
                        variant="rounded"
                        sx={{
                          ...theme.typography.commonAvatar,
                          ...theme.typography.mediumAvatar,
                          bgcolor: 'secondary.dark',
                          color: 'secondary.200',
                          zIndex: 1
                        }}
                        aria-controls="menu-earning-card"
                        aria-haspopup="true"
                        onClick={handleClick}
                      >
                        <MoreHorizIcon fontSize="inherit" />
                      </Avatar>
                      <Menu
                        id="menu-earning-card"
                        anchorEl={anchorEl}
                        keepMounted
                        open={Boolean(anchorEl)}
                        onClose={handleClose}
                        variant="selectedMenu"
                        anchorOrigin={{
                          vertical: 'bottom',
                          horizontal: 'right'
                        }}
                        transformOrigin={{
                          vertical: 'top',
                          horizontal: 'right'
                        }}
                      >
                        <MenuItem onClick={handleClose}>
                          <GetAppTwoToneIcon sx={{ mr: 1.75 }} /> Import Card
                        </MenuItem>
                        <MenuItem onClick={handleClose}>
                          <FileCopyTwoToneIcon sx={{ mr: 1.75 }} /> Copy Data
                        </MenuItem>
                        <MenuItem onClick={handleClose}>
                          <PictureAsPdfTwoToneIcon sx={{ mr: 1.75 }} /> Export
                        </MenuItem>
                        <MenuItem onClick={handleClose}>
                          <ArchiveTwoToneIcon sx={{ mr: 1.75 }} /> Archive File
                        </MenuItem>
                      </Menu>
                    </Grid>
                  </Grid>
                </Grid>
                <Grid sx={{ mb: 0.75 }}>
                  <Grid container sx={{ alignItems: 'center' }}>
                    <Grid size={6}>
                      <Grid container sx={{ alignItems: 'center' }}>
                        <Grid>
                          {timeValue ? (
                            <Typography sx={{ fontWeight: 500, mr: 1, mt: 1.75, mb: 0.75 }}>{search}</Typography>
                          ) : (
                            <Typography sx={{ fontWeight: 500, mr: 1, mt: 1.75, mb: 0.75 }}>{search}</Typography>
                          )}
                        </Grid>
                      </Grid>
                    </Grid>
                    <Grid
                      xs={12}
                      sm={6}
                      sx={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        gap: 1,
                        '.apexcharts-tooltip.apexcharts-theme-light': {
                          color: theme.palette.text.primary,
                          background: theme.palette.background.default,
                          ...theme.applyStyles('dark', { border: 'none' })
                        }
                      }}
                    >
                      <Button variant="outlined" size="small" color="inherit" onClick={() => window.open(link, '_blank')}>
                        Link
                      </Button>

                      <Button variant="outlined" size="small" color="inherit" onClick={() => setOpen(true)}>
                        Description
                      </Button>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </Box>
          </MainCard>
        </>
      )}
    </>
  );
}

ElectronicDeviceCard.propTypes = { isLoading: PropTypes.bool };
