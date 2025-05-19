import { Link as RouterLink } from 'react-router-dom';

// material-ui
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export default function Footer() {
  return (
    <Stack
      direction="row"
      sx={{
        alignItems: 'center',
        justifyContent: 'space-between',
        pt: 3,
        mt: 'auto'
      }}
    >
      <Typography variant="caption">
        &copy; All rights reserved{' '}
        <Typography component={Link} underline="hover" target="_blank" color="secondary.main">
          Mert Deniz Karatas
        </Typography>
      </Typography>
    </Stack>
  );
}
